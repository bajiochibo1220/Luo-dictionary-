"""Build portable HTML and editable Word copies of the web-only manual.

Uses the Python standard library only. The reviewed Markdown is the source;
this exporter deliberately supports only the Markdown constructs used there.
"""
import base64
import html
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/LUO_HERITAGE_WEB_USER_MANUAL.md"
LOGO = ROOT / "public/icons/luo-heritage-512.png"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"w": W}
ET.register_namespace("w", W)
ET.register_namespace("r", R)


def element(parent, name, attributes=None, text=None):
    node = ET.SubElement(parent, f"{{{W}}}{name}", {
        f"{{{W}}}{key}": str(value) for key, value in (attributes or {}).items()
    })
    if text is not None:
        node.text = text
    return node


def plain(value):
    return re.sub(r"\\([\\`*_{}\[\]()#+.!-])", r"\1", value)


def spans(value):
    for part in re.split(r"(\*\*.+?\*\*|`[^`]+`|\[[^\]]+\]\([^)]*\))", value):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            yield plain(part[2:-2]), True, False, None
        elif part.startswith("`") and part.endswith("`"):
            yield part[1:-1], False, True, None
        elif re.fullmatch(r"\[[^\]]+\]\([^)]*\)", part):
            match = re.fullmatch(r"\[([^\]]+)\]\(([^)]*)\)", part)
            yield plain(match[1]), False, False, match[2]
        else:
            yield plain(part), False, False, None


def slug(value):
    value = "".join(item[0] for item in spans(value)).lower()
    return re.sub(r"\s+", "-", re.sub(r"[^\w\s-]", "", value))


def parse_markdown(source):
    blocks, index = [], 0
    lines = source.splitlines()
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        heading = re.match(r"^(#{1,3}) (.+)$", line)
        if heading:
            blocks.append(("heading", len(heading[1]), heading[2]))
            index += 1
        elif line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-+:?", cell) for cell in cells):
                    rows.append(cells)
                index += 1
            assert rows and all(len(row) == len(rows[0]) for row in rows), "Malformed table"
            blocks.append(("table", rows))
        elif line.startswith(">"):
            values = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                value = lines[index].strip()[1:].strip()
                if value:
                    values.append(value)
                index += 1
            blocks.append(("quote", values))
        elif re.match(r"^(?:- |\d+\. )", line):
            ordered = bool(re.match(r"^\d+\. ", line))
            values = []
            pattern = r"^\d+\. (.+)$" if ordered else r"^- (.+)$"
            while index < len(lines):
                item = re.match(pattern, lines[index].strip())
                if not item:
                    break
                values.append(item[1])
                index += 1
            blocks.append(("list", ordered, values))
        else:
            values = [line]
            index += 1
            while index < len(lines) and lines[index].strip() and not re.match(r"^(?:#|\||>|- |\d+\. )", lines[index].strip()):
                values.append(lines[index].strip())
                index += 1
            blocks.append(("paragraph", " ".join(values)))
    return blocks


def inline_html(value):
    output = []
    for text, bold, code, href in spans(value):
        text = html.escape(text)
        if href:
            assert href.startswith("#"), "Manual exporter expects internal links"
            text = f'<a href="{html.escape(href, quote=True)}">{text}</a>'
        elif code:
            text = f"<code>{text}</code>"
        elif bold:
            text = f"<strong>{text}</strong>"
        output.append(text)
    return "".join(output)


def export_html(blocks):
    logo = base64.b64encode(LOGO.read_bytes()).decode("ascii")
    output = [f'<div class="brand"><img alt="Luo Heritage book and sunrise logo" src="data:image/png;base64,{logo}"><span>LANGUAGE · CULTURE · LIVING MEMORY</span></div>']
    anchors = set()
    for block in blocks:
        kind = block[0]
        if kind == "heading":
            level, text = block[1:]
            identifier = slug(text)
            assert identifier not in anchors, "Repeated heading"
            anchors.add(identifier)
            css = ' class="new-page"' if text == "Table of contents" or level == 2 and re.match(r"^\d+\.", text) else ""
            output.append(f'<h{level} id="{identifier}"{css}>{inline_html(text)}</h{level}>')
        elif kind == "paragraph":
            css = ' class="flow"' if block[1].startswith(("**The normal path:", "**If corrections")) else ""
            output.append(f"<p{css}>{inline_html(block[1])}</p>")
        elif kind == "quote":
            output.append('<aside class="notice">' + "".join(f"<p>{inline_html(value)}</p>" for value in block[1]) + "</aside>")
        elif kind == "list":
            tag = "ol" if block[1] else "ul"
            output.append(f"<{tag}>" + "".join(f"<li>{inline_html(value)}</li>" for value in block[2]) + f"</{tag}>")
        elif kind == "table":
            rows = block[1]
            output.append('<div class="table-wrap"><table><thead><tr>' + "".join(f"<th>{inline_html(cell)}</th>" for cell in rows[0]) + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{inline_html(cell)}</td>" for cell in row) + "</tr>" for row in rows[1:]) + "</tbody></table></div>")
    document = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Luo Heritage — Web Application User Manual</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4efe5;color:#26211c;font:16px/1.55 Arial,sans-serif}
main{max-width:980px;margin:30px auto;padding:45px 60px;background:white;border-top:8px solid #6b4724}
.brand{display:flex;align-items:center;gap:20px;color:#805323;font-size:12px;letter-spacing:2px}.brand img{width:88px;height:88px;border-radius:16px}
h1{font:700 42px/1.15 Georgia,serif;color:#5c3a1c;margin:30px 0 12px}h2{font:700 26px/1.25 Georgia,serif;color:#5c3a1c;margin:35px 0 18px;padding-top:12px;border-top:2px solid #dab779}
h3{font-size:18px;color:#623c1d;margin:24px 0 9px}p{margin:10px 0}li{margin:7px 0;padding-left:3px}ul,ol{padding-left:25px}
.notice{background:#fff4da;border:2px solid #ae761c;border-left-width:7px;padding:15px 20px;margin:24px 0}.notice p:first-child{font-size:18px}.flow{padding:14px 18px;background:#f6efdd;border-left:5px solid #a26818}
a{color:#75481a;text-decoration:underline;text-underline-offset:3px}code{font:0.92em Consolas,monospace;color:#653f1f;overflow-wrap:anywhere}
table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:14px;margin:14px 0}th,td{border:1px solid #d8c8ae;padding:10px;vertical-align:top;overflow-wrap:break-word}th{text-align:left;background:#6b4724;color:white}tbody tr:nth-child(even){background:#fcf8ee}
footer{margin-top:36px;padding-top:15px;border-top:1px solid #d8c8ae;font-size:12px;color:#645647}
@media(max-width:700px){main{margin:0;padding:25px 20px}h1{font-size:34px}h2{font-size:23px}table{font-size:13px}th,td{padding:7px}.brand{letter-spacing:1px}}
@page{size:A4;margin:17mm 18mm 21mm;@bottom-center{content:"WEB APPLICATION ONLY · Browser user guide - 30 October 2026  |  Page " counter(page);font:8pt Arial;color:#665441}}
@media print{body{background:white;font-size:10.5pt;line-height:1.45}main{max-width:none;margin:0;padding:0;border:0}.brand img{width:72px;height:72px}h1{font-size:31pt}h2{font-size:18pt;margin-top:23px}h3{font-size:12pt;margin-top:17px}h1,h2,h3{break-after:avoid}p,li{orphans:3;widows:3}li{margin:5px 0}table{font-size:9.2pt}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:7px}th{background:#eee4cf;color:#412910}.notice{break-inside:avoid}.notice p:first-child{font-size:12pt}.new-page{break-before:page}.brand,.notice,th,.flow{print-color-adjust:exact}footer{display:none}}
</style></head><body><main>""" + "\n".join(output) + '<footer>Web application user guide. Edition 2.0 · 30 October 2026.</footer></main></body></html>'
    for href in re.findall(r'href="#([^"]+)"', document):
        assert href in anchors, f"Missing contents destination: {href}"
    SOURCE.with_suffix(".html").write_text(document, encoding="utf-8")


def xml_bytes(node):
    return ET.tostring(node, encoding="utf-8", xml_declaration=True)


def export_docx(blocks):
    document = ET.Element(f"{{{W}}}document")
    body = element(document, "body")
    numbering = ET.Element(f"{{{W}}}numbering")
    for number, form, marker in [(0, "decimal", "%1."), (1, "bullet", "•")]:
        abstract = element(numbering, "abstractNum", {"abstractNumId": number})
        level = element(abstract, "lvl", {"ilvl": 0})
        element(level, "start", {"val": 1})
        element(level, "numFmt", {"val": form})
        element(level, "lvlText", {"val": marker})
        props = element(level, "pPr")
        element(props, "ind", {"left": 360, "hanging": 280})
    list_id, bookmark_id = 0, 0
    bookmarks = {slug(block[2]): "s" + str(index) for index, block in enumerate(blocks) if block[0] == "heading"}

    def paragraph(parent, text, style="Normal", numbered=None, page_break=False):
        paragraph_node = element(parent, "p")
        props = element(paragraph_node, "pPr")
        element(props, "pStyle", {"val": style})
        if page_break:
            element(props, "pageBreakBefore")
        if numbered is not None:
            numbers = element(props, "numPr")
            element(numbers, "ilvl", {"val": 0})
            element(numbers, "numId", {"val": numbered})
        for value, bold, code, href in spans(text):
            holder = paragraph_node
            if href:
                assert href.startswith("#") and href[1:] in bookmarks
                holder = element(paragraph_node, "hyperlink", {"anchor": bookmarks[href[1:]]})
            run = element(holder, "r")
            run_props = element(run, "rPr")
            if bold:
                element(run_props, "b")
            if href:
                element(run_props, "color", {"val": "805323"})
                element(run_props, "u", {"val": "single"})
            if code:
                element(run_props, "rFonts", {"ascii": "Consolas", "hAnsi": "Consolas"})
                element(run_props, "sz", {"val": 19})
            text_node = element(run, "t", text=value)
            text_node.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        return paragraph_node

    logo_paragraph = element(body, "p")
    drawing = element(element(logo_paragraph, "r"), "drawing")
    drawing.append(ET.fromstring('''<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><wp:extent cx="914400" cy="914400"/><wp:docPr id="1" name="Luo Heritage logo" descr="Book, sunrise and lake"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline>'''))
    for block in blocks:
        kind = block[0]
        if kind == "heading":
            level, text = block[1:]
            style = "Title" if level == 1 else "Subtitle" if text == "Web Application User Manual" else "Heading1" if level == 2 else "Heading2"
            node = paragraph(body, text, style, page_break=text == "Table of contents" or level == 2 and bool(re.match(r"^\d+\.", text)))
            node.insert(1, ET.Element(f"{{{W}}}bookmarkStart", {f"{{{W}}}id": str(bookmark_id), f"{{{W}}}name": bookmarks[slug(text)]}))
            element(node, "bookmarkEnd", {"id": bookmark_id})
            bookmark_id += 1
        elif kind == "paragraph":
            paragraph(body, block[1])
        elif kind == "quote":
            for value in block[1]:
                paragraph(body, value, "Notice")
        elif kind == "list":
            list_id += 1
            number = element(numbering, "num", {"numId": list_id})
            element(number, "abstractNumId", {"val": 0 if block[1] else 1})
            for value in block[2]:
                paragraph(body, value, numbered=list_id)
        elif kind == "table":
            table = element(body, "tbl")
            props = element(table, "tblPr")
            element(props, "tblW", {"w": 0, "type": "auto"})
            borders = element(props, "tblBorders")
            for edge in ["top", "left", "bottom", "right", "insideH", "insideV"]:
                element(borders, edge, {"val": "single", "sz": 4, "color": "D8C8AE"})
            margins = element(props, "tblCellMar")
            for edge in ["top", "left", "bottom", "right"]:
                element(margins, edge, {"w": 90, "type": "dxa"})
            grid = element(table, "tblGrid")
            columns = len(block[1][0])
            for _ in range(columns):
                element(grid, "gridCol", {"w": 9638 // columns})
            for row_index, cells in enumerate(block[1]):
                row = element(table, "tr")
                row_props = element(row, "trPr")
                element(row_props, "cantSplit")
                if row_index == 0:
                    element(row_props, "tblHeader")
                for value in cells:
                    cell = element(row, "tc")
                    cell_props = element(cell, "tcPr")
                    element(cell_props, "tcW", {"w": 9638 // columns, "type": "dxa"})
                    if row_index == 0:
                        element(cell_props, "shd", {"fill": "EEE4CF"})
                    paragraph(cell, f"**{value}**" if row_index == 0 else value, "TableText")
            paragraph(body, "")

    section = element(body, "sectPr")
    footer_ref = element(section, "footerReference", {"type": "default"})
    footer_ref.set(f"{{{R}}}id", "rIdFooter")
    element(section, "pgSz", {"w": 11906, "h": 16838})
    element(section, "pgMar", {"top": 964, "right": 1020, "bottom": 1191, "left": 1020, "header": 400, "footer": 550, "gutter": 0})

    styles = ET.Element(f"{{{W}}}styles")
    for identifier, size, font, color, bold in [
        ("Normal", 22, "Calibri", "26211C", False), ("Title", 62, "Georgia", "5C3A1C", True),
        ("Subtitle", 32, "Calibri", "805323", True), ("Heading1", 36, "Georgia", "5C3A1C", True),
        ("Heading2", 26, "Calibri", "623C1D", True), ("TableText", 20, "Calibri", "26211C", False),
        ("Notice", 23, "Calibri", "5C3A1C", False), ("Footer", 16, "Calibri", "665441", False),
    ]:
        style = element(styles, "style", {"type": "paragraph", "styleId": identifier})
        element(style, "name", {"val": identifier})
        if identifier != "Normal":
            element(style, "basedOn", {"val": "Normal"})
        props = element(style, "pPr")
        heading = identifier in ["Title", "Subtitle", "Heading1", "Heading2"]
        if heading:
            element(props, "keepNext")
        if identifier == "Notice":
            element(props, "shd", {"fill": "FFF4DA"})
        element(props, "spacing", {"before": 200 if heading else 0, "after": 110 if heading else 100, "line": 290, "lineRule": "auto"})
        if identifier == "Footer":
            element(props, "jc", {"val": "center"})
        if identifier.startswith("Heading"):
            element(props, "outlineLvl", {"val": 0 if identifier == "Heading1" else 1})
        runs = element(style, "rPr")
        element(runs, "rFonts", {"ascii": font, "hAnsi": font})
        element(runs, "sz", {"val": size})
        element(runs, "color", {"val": color})
        if bold:
            element(runs, "b")
    footer = ET.Element(f"{{{W}}}ftr")
    footer_p = paragraph(footer, "WEB APPLICATION ONLY · Browser user guide - 30 October 2026 | Page ", "Footer")
    field = element(footer_p, "fldSimple", {"instr": "PAGE"})
    element(element(field, "r"), "t", text="1")

    package_ns = "http://schemas.openxmlformats.org/package/2006/relationships"
    relations = ET.Element(f"{{{package_ns}}}Relationships")
    for identifier, kind, target in [("rIdStyles", "styles", "styles.xml"), ("rIdNumbering", "numbering", "numbering.xml"), ("rIdFooter", "footer", "footer1.xml"), ("rIdLogo", "image", "media/logo.png")]:
        ET.SubElement(relations, f"{{{package_ns}}}Relationship", {"Id": identifier, "Type": f"{R}/{kind}", "Target": target})
    types = '''<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'''
    root_rels = f'''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{package_ns}"><Relationship Id="rIdDocument" Type="{R}/officeDocument" Target="word/document.xml"/></Relationships>'''
    with zipfile.ZipFile(SOURCE.with_suffix(".docx"), "w", compression=zipfile.ZIP_DEFLATED) as package:
        for name, value in [("[Content_Types].xml", types), ("_rels/.rels", root_rels), ("word/document.xml", xml_bytes(document)), ("word/styles.xml", xml_bytes(styles)), ("word/numbering.xml", xml_bytes(numbering)), ("word/footer1.xml", xml_bytes(footer)), ("word/_rels/document.xml.rels", xml_bytes(relations)), ("word/media/logo.png", LOGO.read_bytes())]:
            package.writestr(name, value)
    with zipfile.ZipFile(SOURCE.with_suffix(".docx")) as package:
        assert package.testzip() is None
        for name in package.namelist():
            if name.endswith((".xml", ".rels")):
                ET.fromstring(package.read(name))
        tree = ET.fromstring(package.read("word/document.xml"))
        text = "\n".join("".join(node.text or "" for node in paragraph.iter(f"{{{W}}}t")) for paragraph in tree.iter(f"{{{W}}}p"))
        assert "THIS MANUAL IS FOR THE WEB APPLICATION ONLY." in text
        assert "Packaged Android and iOS clients share the main application interface." in text
        for block in blocks:
            kind = block[0]
            values = [block[2]] if kind == "heading" else [block[1]] if kind == "paragraph" else block[2] if kind == "list" else block[1] if kind == "quote" else [cell for row in block[1] for cell in row]
            for value in values:
                assert "".join(span[0] for span in spans(value)) in text, "Word export lost source text"


if __name__ == "__main__":
    content = SOURCE.read_text(encoding="utf-8")
    blocks = parse_markdown(content)
    export_html(blocks)
    export_docx(blocks)
    print(f"Built HTML and Word copies from {len(content.split()):,} words; contents links and Word XML validated.")

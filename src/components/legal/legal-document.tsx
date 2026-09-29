import Link from "next/link";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function inline(text: string, keyPrefix: string) {
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*)/g;
  const result: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) result.push(text.slice(last, match.index));
    if (match[2] && match[3]) {
      const href = match[3].trim();
      const safeInternal = /^\/(terms|privacy|about)(#[a-z0-9-]+)?$/.test(href);
      const safeExternal = /^https:\/\//i.test(href);
      if (safeInternal) result.push(<Link key={`${keyPrefix}-${index}`} href={href} className="font-medium text-amber-800 underline underline-offset-2">{match[2]}</Link>);
      else if (safeExternal) result.push(<a key={`${keyPrefix}-${index}`} href={href} target="_blank" rel="noreferrer" className="font-medium text-amber-800 underline underline-offset-2">{match[2]}</a>);
      else result.push(match[2]);
    } else if (match[4]) {
      result.push(<strong key={`${keyPrefix}-${index}`} className="font-semibold">{match[4]}</strong>);
    }
    last = pattern.lastIndex;
    index++;
  }
  if (last < text.length) result.push(text.slice(last));
  return result;
}

export function LegalDocument({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const sections = lines.flatMap((line) => {
    const heading = line.match(/^##\s+(.+)$/);
    return heading ? [{ title: heading[1], id: slug(heading[1]) }] : [];
  });
  const blocks: Array<{ type: "heading" | "paragraph" | "list"; value: string[] }> = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => { if (paragraph.length) blocks.push({ type: "paragraph", value: paragraph.splice(0) }); };
  const flushList = () => { if (list.length) blocks.push({ type: "list", value: list.splice(0) }); };

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      flushParagraph(); flushList(); blocks.push({ type: "heading", value: [line.replace(/^##\s+/, "")] });
    } else if (/^[-*]\s+/.test(line)) {
      flushParagraph(); list.push(line.replace(/^[-*]\s+/, ""));
    } else if (!line.trim()) {
      flushParagraph(); flushList();
    } else if (/^#\s+/.test(line)) {
      flushParagraph(); flushList();
    } else {
      flushList(); paragraph.push(line.trim());
    }
  }
  flushParagraph(); flushList();

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Document contents" className="h-fit rounded-xl border border-stone-200 bg-white/70 p-4 lg:sticky lg:top-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">On this page</h2>
        <ol className="max-h-[45vh] space-y-2 overflow-y-auto text-xs leading-5 lg:max-h-[75vh]">
          {sections.map((section) => <li key={section.id}><a className="text-stone-700 hover:text-amber-800 hover:underline" href={`#${section.id}`}>{section.title}</a></li>)}
        </ol>
        <div className="mt-4 border-t border-stone-200 pt-3 text-xs leading-5"><Link href="/terms" className="block text-amber-800 underline">Terms and Conditions</Link><Link href="/privacy" className="block text-amber-800 underline">Privacy Policy</Link></div>
      </nav>
      <div className="min-w-0 space-y-5 text-sm leading-7">
        {blocks.map((block, blockIndex) => block.type === "heading" ? (
          <h2 id={slug(block.value[0])} key={`heading-${blockIndex}`} className="scroll-mt-6 border-b border-stone-300 pb-2 pt-4 font-serif text-2xl text-stone-900">{block.value[0]}</h2>
        ) : block.type === "list" ? (
          <ul key={`list-${blockIndex}`} className="list-disc space-y-2 pl-6">{block.value.map((item, itemIndex) => <li key={itemIndex}>{inline(item, `list-${blockIndex}-${itemIndex}`)}</li>)}</ul>
        ) : (
          <p key={`paragraph-${blockIndex}`} className="whitespace-pre-wrap">{inline(block.value.join(" "), `paragraph-${blockIndex}`)}</p>
        ))}
      </div>
    </div>
  );
}

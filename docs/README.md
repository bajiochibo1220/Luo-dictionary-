# Luo Heritage user documentation

**These manuals cover the web application only. Android and iOS applications are still in development.**

| Copy | Purpose |
|---|---|
| [PDF manual](LUO_HERITAGE_WEB_USER_MANUAL.pdf) | Reading, printing and sharing. Includes a linked table of contents with checked page numbers and PDF navigation bookmarks. |
| [Word manual](LUO_HERITAGE_WEB_USER_MANUAL.docx) | Editing and review. Includes linked contents, numbered instructions and page-number fields in the footer. |
| [HTML manual](LUO_HERITAGE_WEB_USER_MANUAL.html) | Reading in a browser, including narrow phone screens. The logo is embedded; no remote assets are needed to read this document. |
| [Markdown source](LUO_HERITAGE_WEB_USER_MANUAL.md) | The source used to maintain all copies. |

Edition 1.0 is dated 14 October 2026. The manual contains eighteen chapters covering everyday use, contributions, staff review, publication, administration, updates, troubleshooting and current development limits.

## Review basis

The instructions were reviewed against the current workspace's web pages, components, API actions and access checks, including:

- Login, registration, Google profile completion and profile preferences.
- Public and administrative headers, account menus, sidebars and module views.
- Search, shared chat, saved conversations and the account page.
- Contribution forms, browser recording, submissions and feedback.
- Cultural Review, rejection voting, editor changes and publishing permissions.
- Media uploads, transcripts, translations, users, staff appointments and language management.
- System settings, database backups and installed-website update controls.

The instructions distinguish internal approval from public release and identify unfinished features. Documentation review does not certify a live deployment, every end-to-end journey, all Phase Two requirements or store readiness.

## Updating the manual

1. Edit the Markdown source after checking the current interface and button names.
2. Update the edition and review date in the manual and exporter headers/footers when releasing a new edition.
3. From the project root, run:

```powershell
python scripts/build-web-manual.py
node scripts/export-web-manual.cjs
```

The first command uses Python's standard library to generate HTML and Word. It validates contents links, Word package/XML structure and preservation of all parsed source text in Word.

The second command uses Node.js 24 and the installed Windows Chrome browser in headless mode to generate the PDF. It opens only the local manual, blocks HTTP/HTTPS page requests, checks all eighteen sections and contents destinations, checks widths of 360, 794 and 1200 pixels, and prints twice to verify the contents page numbers against the actual PDF page tree. The PDF includes an outline and embedded fonts/logo. The generated preview is stored in the temporary directory for visual inspection.

Review all copies before distributing a new edition. Keep the web-only notice and the Android/iOS development notice unless their status has been formally updated. Commit the Markdown, HTML, Word and PDF together so readers receive consistent instructions.

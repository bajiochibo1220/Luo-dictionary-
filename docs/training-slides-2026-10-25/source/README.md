# Training slide source and verification

Edition: 25 October 2026. Eleven role guides plus the selection deck; 240 slides.

The PowerPoint files contain editable text, diagrams and embedded screenshots.
The PDFs contain the same visible instructions, with selectable text and page
bookmarks. The distribution ZIP contains all twelve PowerPoint/PDF pairs plus
the selection index and reading instructions. No account records or passwords
are included.

Screenshots were captured in headless Chrome from the actual current React
components. They use isolated, clearly labelled sample state. Authentication,
database reads and navigation were replaced by local training fixtures; no
production workflow was performed. These are interface illustrations, not live
email-delivery, sign-in, publication or device acceptance evidence. Some frames
show a component inside a simple branded training frame rather than a complete
authenticated browser session. The screenshot manifest identifies each source
component and its SHA-256 fingerprint.

Role guidance was checked against src/lib/permissions.ts, the account recovery
form, content submission/validation/approval handlers, administrator screens,
and the shared contribution, learning and education components. A researcher
interest does not grant private transcript access. Teaching access is separate
from staff publication duties. Super Admin oversight is separate from language
editorial permissions; Master Super Admin ownership remains distinct.

Verification checked all 240 PDF pages and PowerPoint slide counts, every
instruction and tip, slide bounds, embedded images, image descriptions,
internal contents links, PDF bookmarks, absence of unfinished copy, valid ZIP
packages, and matching archive contents. Every PDF page was rendered. Visual
samples and role contact sheets were inspected. PowerPoint packages were
structurally checked; the visual previews were rendered from the matching PDFs.
See verification.json for results.

For updates, edit the slide-content definitions in build_luo_training.py and
adjust the project/output paths to your checkout. The generator uses
python-pptx, reportlab and Pillow; the checker also uses pypdf and pypdfium2.
Source scripts preserve their original build paths and must be configured
before running elsewhere. Update screenshots after interface changes, and
re-run the matching checks. Keep credentials out of screenshots and examples.

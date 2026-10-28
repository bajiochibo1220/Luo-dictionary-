# Complete item downloads and Groq alternative — 28 October 2026

The public collection feed and item dialogs now include **Download complete item (ZIP)**. The option is also available on the older artifact grid and public detail pages for dictionary entries, oral histories, songs, folktales, proverbs, riddles, artifacts and heritage sites. Shared clients use the configured API origin for the link, including when loading more items.

A package contains the complete current public descriptions, available translated versions, transcript text and alignment timestamps, media captions and alternative text, original image/audio/video/document/model attachments, a plain-text description, JSON metadata and an offline `index.html`. Embedded transcript fields are exported as text files as well. Dictionary entries and items without media are supported. Text is not shortened to match card previews, and a media filter does not limit the contents of the package.

The ZIP64 archive streams originals sequentially with bounded buffers. Storage responses are restricted to HTTPS Cloudinary hosts, including redirects. Cancelling stops upstream transfers. A missing or failed attachment errors the stream instead of quietly returning a supposedly complete ZIP. Public eligibility is checked for the parent, every attachment and every transcript. Participant identities, storage credentials/addresses, consent evidence, private coordinates and unknown internal JSON fields are not included. Source rights and public attribution fields are retained. Hosting request-duration and bandwidth limits apply; individual-file downloads remain available.

The earlier AI-provider request is implemented as a selectable Groq alternative. The web and shared management settings accept Groq's own masked key and text/vision model configuration. Saved provider choice takes precedence over the environment provider selector, and the choice is refreshed to avoid stale settings across server instances. Provider-specific usable environment credentials/models retain priority over saved credentials/models. Blank or placeholder environment credentials cannot hide a usable admin-saved key. Missing cached credentials are re-read before failing. Masked key previews are rejected on new saves. No cross-provider credential reuse or automatic fallback occurs. Text, tutor, translations, summaries, entity extraction and image understanding route to the selected provider. Both providers use governed public text retrieval. Audio transcription and image generation remain disabled in this integration.

Groq offers a free tier with provider limits and requires a separate API key. Create one at https://console.groq.com/keys, then choose Groq in System > API Credentials, enter it, save and test. Defaults verified against current official docs: `openai/gpt-oss-20b` for text and `qwen/qwen3.8-27b` for images; the latter is a preview model and account availability may change. No Groq key was supplied, so Groq generation is tested with mocked provider responses, not live inference.

Verification:
- Initial full regression after complete downloads: 347 passed.
- Final focused archive/provider tests: 33 passed.
- Download tests extract a real ZIP and compare the original image/audio/video/document bytes, complete descriptions, translated text and transcript text; exercise redaction, safe HTML, invalid/restricted records, bad redirects, missing media and cancellation.
- Real read-only storage check: a public item's ZIP contained 5 files and its original image (22,291 archive bytes). Extracted offline viewer loaded the image successfully in Chrome at 390 px, without horizontal overflow. No database/account writes were made by this check.
- Simulated large-video multi-chunk stream check passed: 6,291,456 original video bytes across 96 chunks, preserved exactly in a valid ZIP64 archive (6,294,329 bytes).
- Final complete regression: 355 passed, 0 failed. Web and mobile production builds passed. The final web bundle regeneration also passed after moving the legacy dictionary download control below its heading.
- Final lint: 0 errors and 12 existing warnings. TypeScript validation passed in the production build. Mobile build retained the existing bundle-size warning.

The public Vercel website and its bootstrap API responded successfully during diagnosis. The frontend code uses same-origin APIs on the web. The updated code has not been published or deployed by this task; deploy it to the serving backend/site before expecting the new controls on https://luo-dictionary.vercel.app.

References:
- https://www.archiverjs.com/docs/archiver/
- https://console.groq.com/docs/models
- https://console.groq.com/docs/vision
- https://console.groq.com/docs/reasoning
- https://console.groq.com/docs/billing-faqs
- https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions

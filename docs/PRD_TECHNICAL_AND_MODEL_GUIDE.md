# Technical and model guide


## Current interface and policy update - 30 October 2026

The current public assistant is **CULTURAL HERITAGE**, scoped to Luo cultural knowledge, history, songs, traditions and Dholuo. It may combine general model knowledge with retrieved public sources. Test English/Dholuo question handling and the expandable translation into the other language, source accuracy, processing consent, provider errors and saved-history permissions. Older examples implying an unrestricted general-purpose assistant are superseded.

Language preference is selected during registration. Approved public Dholuo interface text shows read-only English below; public sidebar/masthead language selectors are removed. Admin target-language controls remain for assigned editing work. Login opens first; public browsing is an explicit option. Forgotten password contains only the reset sequence, and email delivery requires a configured verified sender and provider key. Account deletion is a separate confirmed action.

Explore uses a top-layer scrollable dialog with Back/X, including short landscape screens. Item-details Back/X remain visible while scrolling. Header Back controls cover web and shared packaged-client views. Search is pinned above the feed; media filters are fixed in the compact black bottom dock. More/less expands the short description inline; Explore this item shows complete information. Contribute opens the active collection's form and preserves it through sign-in. Browser installation uses native eligibility and Safari's Add to Home Screen fallback.

Current operational notices are applied consistently to customized legal text, public legal pages and registration consent fingerprints. They do not alter historical acceptance records or fill unknown institutional details. Complete operator/contact/provider/retention/transfer fields before treating the policy drafts as finalized. See the current user and administration guides in docs, and docs/legal/CURRENT_PLATFORM_NOTICES_2026-10-30.md (paths are relative to the repository root).


## Architecture and boundaries

The Next.js application and packaged clients share React workspaces and versioned JSON APIs. Prisma/PostgreSQL stores records, governance, learning resources/progress, game rooms and audit history. Cloudinary stores media. New functionality reuses authentication, language assignments, maintenance enforcement and the existing review/publish workflow.

| Endpoint | Access and purpose |
| --- | --- |
| POST `/api/v1/tutor` | Signed-in practice; explicit processing consent; bounded input; provider quota for AI, account rate limit for dictionary practice. |
| GET/POST `/api/v1/ai-tools` | Signed-in source selection and assistance; object and parent must be currently published and publicly eligible before provider access. |
| GET/POST `/api/v1/games` | Signed-in room membership, host controls, source-version validation and server grading. |
| GET `/api/v1/knowledge` | Bounded public graph with eligible endpoints only. |
| GET `/api/v1/places` | Approved approximate public locations for an active community; no raw GPS. |
| POST `/api/v1/activity` | Bounded, rate-limited activity signals; entity eligibility checked; broad country only from the trusted deployment header. |
| GET `/api/v1/research` | Assigned research/teaching/curation access and object-level governance. |

Use the exact contracts in `src/lib/tutor-contract.ts`, `game-service.ts`, `knowledge-links.ts` and route sources. Responses use the application's success/data/error envelope. Browser mutations require a same-origin request; packaged clients use authenticated bearer requests and existing CORS allowlists. A route being public does not make its underlying private records public.

Game rooms pin the published learning resource version. Database locks serialize mutations, membership is unique, answers are submitted once and result publication waits for round completion. Learning progress is updated atomically without overwriting a better score for the same resource version. Room expiry prevents indefinite access. Server scoring does not establish pedagogical validity; reviewed questions do.

## Models and privacy

Existing text assistance and the new media adapter use the configured Gemini provider. `GEMINI_IMAGE_MODEL` or protected `gemini_image_model` selects illustration generation; the configured text model handles text/audio/image assistance. Credentials remain server-side. Network calls are bounded and errors sanitized. Media is fetched only from trusted storage hosts with size/redirect limits. Illustration requires an actual image response.

Tutor prompts constrain submitted text and retrieved context to data, distinguish practice fiction from authentic sources and require uncertainty disclosure. These measures reduce risk; generated translations and cultural statements still need review. OCR, STT and image descriptions are provider capabilities, not locally trained Dholuo models. No new model weights, accuracy benchmark or training dataset is claimed.

Browser speech recognition and synthesis depend on platform and language support. Personal recordings are separately consented before cloud transcription. Calibrated Dholuo pronunciation scoring, custom voice training, culturally accurate reconstruction and custom visual classifiers remain data-dependent research work. Prepare representative, consented data, annotation guidance, train/validation/test splits, evaluation thresholds and expert review before enabling those claims.

Public related-record links form the reviewed knowledge graph. This does not claim an automatically validated ontology or entity recognizer. Existing semantic retrieval and entity pipelines must be evaluated on approved held-out material before accuracy claims.

## Repository and viewers

Research type metadata distinguishes publications, reports, field notes, datasets and models. Raw upload formats include dataset/model and OBJ/GLB/glTF files; recognized formats are derived from verified storage responses. Downloads obey governance. Do not execute uploaded model or dataset files on the application server.

The interactive artifact viewer parses bounded OBJ geometry, validates numeric values/indices and renders a local WebGL mesh. It does not fetch external OBJ materials. Guided stories animate reviewed still images with text; reduced-motion preferences are respected. This is not an automatically generated cultural film or complete 3D virtual reconstruction.

Approved map coordinates are rounded to two decimal places and explicitly consented. Leaflet/OpenStreetMap maps load on request. Attribution is retained. Exact source coordinates and participant details remain excluded from public projections and ordinary exports.

## Evidence and acceptance

Public discovery uses `/explore`, which redirects into the shared browser/packaged `/application#/explore` screen. Optional `subject` values are restricted to the exact PRD subject catalog. `GET /api/v1/library?language=luo&module=subjects&subject=Fishing%20traditions` retrieves matching `data.subject_area` classifications across active public modules, retaining existing publication, consent, embargo and media permission filters. Its `q`, `records` and `dictionary` parameters keep the same bounded search/pagination contract. Responses carry `subject` so subsequent search and pagination preserve their scope. No database migration or permission assignment is involved. Audience choices remain transient client discovery state.

Automated tests use isolated fixtures, not production cultural data. Builds and tests verify software paths; actual provider output quality, fluent translations, accessibility with target users, native devices, backup restoration and stakeholder acceptance require separately recorded checks. See [the tracker](../PRD_IMPLEMENTATION_TRACKER.md).

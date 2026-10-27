# Technical and model guide

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

Automated tests use isolated fixtures, not production cultural data. Builds and tests verify software paths; actual provider output quality, fluent translations, accessibility with target users, native devices, backup restoration and stakeholder acceptance require separately recorded checks. See [the tracker](../PRD_IMPLEMENTATION_TRACKER.md).

# PRD sections 1–15 implementation tracker

Source: `PHASE ONE AND TWO/JOOUST LuoLinguaAI PRD.docx`, Draft 1.0. The document is a specification, not an instruction to send messages or publish data. This work follows the user's instruction to implement feasible PRD requirements. It does not claim NRF acceptance.

No feature is complete merely because a page, database field or button exists. Each remaining feature needs an accessible user journey, server authorization where applicable, error handling, tests and integration evidence. Approved public cultural content must never be invented to conceal empty collections.

| Section | Scope | Implementation and remaining verification |
| --- | --- | --- |
| 1 | Project overview | Public cultural preservation and voluntary learning; community languages retain their paired English versions. |
| 2 | Objectives | Preservation, discovery, research and intergenerational access; outcomes require genuine content and measured use. |
| 3 | Target users | Children, youth, adults, schools, universities, researchers, cultural institutions, museums, tourists, diaspora, linguists, AI researchers and agencies. Public users do not require classroom membership or administrative privileges. |
| 4 | Fifteen functional modules | Retain existing collection/review flows; complete tutor, distinct games, immersive viewers and research journeys. Track each source module in the requirement register. |
| 5 | AI components | Implement provider/browser capabilities with explicit consent, permission checks and review boundaries. Separate generation from verified cultural knowledge. |
| 6 | User management | Guests, registered users, students, teachers, researchers, administrators, moderators and editors. Interests are not privileges. Moderation can map to assigned language admins; cultural review remains an editor duty. |
| 7 | Administration | User management, content approval, analytics, AI monitoring, reports, dataset uploads, metadata and backup management. |
| 8 | Technical requirements | Web and packaged clients, offline/low-bandwidth paths, synchronization, multilingual interface, authentication, RBAC and APIs. iOS/store acceptance needs its actual platform and credentials; it is not a large-data deferral. |
| 9 | Repository | Text, audio, images, video, GIS, metadata, models, datasets and transcripts with permission-aware retrieval and exports. |
| 10 | Security | Authentication, encryption, roles, backups, audit, consent and copyright. Verify each data access path; do not infer a blanket security certification from tests. |
| 11 | Analytics | Active users, learning progress, popular stories, searches, AI use, downloads, broad geographic reach and engagement. Avoid unnecessary precise location or personal information. |
| 12 | Expansion | Configurable communities and their English versions; do not classify English as an Indigenous community. |
| 13 | Content inventory | Support all 27 listed subject areas. Actual holdings require authorized contribution and expert review; software support does not mean the inventory is populated. |
| 14 | Deliverables | Web/mobile software, admin, chatbot/tutor, repository/API and complete user, training, technical, deployment, maintenance and model documentation. |
| 15 | Success indicators | Establish measurable preservation, usability, retrieval, adoption and scalability checks. Institutional acceptance and real adoption cannot be fabricated. |

## Data-dependent exceptions

- Custom Dholuo pronunciation scoring, voice training and linguistically validated accuracy need suitable approved speech and annotations. Implement recording/transcription/synthesis integration where feasible without claiming calibrated pronunciation scores.
- Culturally faithful AI reconstruction and custom visual classification need approved, labelled images and expert validation. Viewer/upload/inference interfaces are ordinary software work and remain in scope.
- Authentic source material, fluent translations, cultural approval and measured adoption depend on people and content; tools must expose the missing work rather than inventing it.

Configuration, paid-provider availability, Mac/iPhone builds and deployment infrastructure are external prerequisites, not completed features or large-data exceptions. Record them explicitly if verification cannot run.

## Execution record

Updated 27 October 2026. The older combined PRD/NRF percentage is a historical assessment, not a completion score for this PRD-only pass. No institutional acceptance or NRF sign-off has been inferred.

### Section 4: module implementation

| PRD module | Software available | Acceptance boundary |
| --- | --- | --- |
| 1 Dictionary | Vocabulary, definitions, English/Kiswahili, pronunciation/audio, examples, synonyms/antonyms, origin and grammar metadata; paired editing and public downloads. | Actual vocabulary and linguistic accuracy need approved contributions. |
| 2 Proverbs | Original/literal/meaning/interpretation/context/usage/related records and audio/video attachments. | Editorial approval and authentic holdings. |
| 3 Oral histories | Community/clan/migration/events/heroes/interviews, media and approved approximate public maps. | Fieldwork, interview consent and separate public-location approval. |
| 4 Folktales | Original/English, narration, characters, moral, children's version and teacher notes; AI illustration draft tool; animated illustrated gallery. | Provider quota currently blocks live AI verification; reviewed images/text are required. The gallery animates still images rather than generating an animated film. |
| 5 Songs | Lyrics, translation, meaning, recordings, notation, instruments and context fields. | Appropriate rights and authentic recordings. |
| 6 Riddles | Questions, answers, explanations, difficulty and reviewed question games; invitation-based multiplayer challenge service. | Publish reviewed game resources; no invented question bank. |
| 7 Artifacts | Image/text/use/status/museum/material metadata, model uploads/downloads and bounded interactive OBJ viewer. | OBJ geometry is supported by the viewer; GLB/glTF are files rather than interactive viewers. Culturally accurate AI reconstruction is data-dependent. |
| 8 Heritage sites | History, stories, visitor details, eligible media, approved map points and guided image tour. | Point-map/image tours are available; a surveyed immersive 360-degree reconstruction needs source material and validation. |
| 9 Tutor | Conversation, translation, grammar/writing/story practice, reviewed vocabulary quizzes, browser speech/voice playback, local recording and separately consented AI transcription. | Browser language support varies; live provider quota is exhausted. Calibrated Dholuo pronunciation correction/scoring remains data-dependent. |
| 10 Chatbot | Existing governed cultural retrieval, conversation history and contextual assistance; learning resources remain separately browsable. | Provider availability and evaluation against approved cultural sources; generated statements are not cultural approval. |
| 11 Games | Vocabulary race, word puzzle, memory, proverb matching, story completion, treasure clues, artifact identification and multiplayer battles. | Reviewed question content/images and actual multiplayer device acceptance remain required. |
| 12 Learning | Three levels; reading/writing/listening/speaking activities; consented writing assistance, recording/voice controls and versioned progress/offline queue. | Publish meaningful lessons; real educational outcomes need evaluation. |
| 13 Calendar | Existing reviewed event resources, dates, time zones, locations and community events. | Owners supply authentic ceremonies/festivals/anniversaries. |
| 14 Audio-visual | Existing filtered image/audio/video/transcript collections; lazy/preload-none media and permission-aware original downloads; responsive image previews. | Media rights, inventory and representative bandwidth/device testing. |
| 15 Research | Public catalogue plus assigned research/teaching access; publications, reports, field notes, datasets, model documentation, transcripts/metadata and protected attachments/exports. | Curated consented data and approved storage/retention; teaching access does not grant private research exports. |

### Sections 5–15: cross-cutting delivery

- **5 AI:** added bounded consented OCR, transcription, image-description and illustration draft paths, tutor modes and explicit reviewed knowledge links. Existing entity extraction and semantic retrieval remain in use. Human review and held-out evaluation are required before accuracy claims. See `src/lib/ai`, `ai-tools-service.ts`, `tutor-service.ts` and `knowledge-service.ts`.
- **6 Roles:** retain guest/registered/optional learning profiles and assigned teacher/researcher roles. Language administrators provide moderation; content editors combine cultural review and editing. No new duplicate reviewer role. Research now checks the current parent publication status as well as consent.
- **7 Administration:** existing role/content/approval/audit/backup tools extended with research/dataset/model metadata, subject classification, learning/game authoring and protected image-model configuration. Existing merged editorial flow remains authoritative.
- **8 Technical:** shared feature routes are wired into web and packaged navigation. The packaged UI builds. Offline saved content/progress remains available; multiplayer, AI, map tiles and new exports require connectivity. Native binary signing, real devices and stores remain separate acceptance work.
- **9 Repository:** adds dataset/model raw formats and verified-format handling, explicit public GIS export, approved record relationships and bounded OBJ viewing. Files inherit governance. Uploaded code/model files are not executed.
- **10 Security:** new routes use bounded requests, current authentication, origin/CORS checks, quotas and object/parent consent checks. Multiplayer serializes mutations, hides answer keys before round completion and atomically records progress. Raw GPS/relationship identifiers are excluded from ordinary public projection. Existing encryption/authentication/audit controls remain; penetration testing, infrastructure encryption configuration and restoration rehearsal are not certified by these tests.
- **11 Analytics:** adds bounded activity telemetry, searches, media play, content opening, governed download audit/events, AI interactions and learning progress/attempt metrics. Geographic reporting uses a broad trusted country header, not precise participant coordinates. Anonymous activity is not mislabelled as identified users.
- **12 Expansion:** new feature pages select active communities and preserve source/English context. Learning speech controls now receive the actual community code on web and packaged clients. A new community still needs its own approved content and interface wording.
- **13 Inventory:** all 27 exact PRD subject names are selectable; no fake records were inserted to make them appear populated.
- **14 Documentation:** [user guide](docs/PRD_USER_GUIDE.md), [admin/training guide](docs/PRD_ADMIN_AND_TRAINING_GUIDE.md), [technical/model guide](docs/PRD_TECHNICAL_AND_MODEL_GUIDE.md), [deployment/maintenance guide](docs/PRD_DEPLOYMENT_AND_MAINTENANCE.md). Source remains in the private local repository. Older 25 October training exports describe historical workflows and need regeneration before redistribution.
- **15 Success:** measure approved holdings, target-user usability, retrieval accuracy, learning outcomes, adoption/engagement, access control and future-community configuration. Actual adoption, representative scale tests and stakeholder acceptance remain unrecorded.

### Verification record

- Full automated regression: **230 passed, 0 failed** (`node --test --test-isolation=none tests/*.test.cjs`). Includes original role/navigation/governance/offline tests and new PRD contracts, grading, source withdrawal, map privacy and graph filtering.
- Browser: tutor consent/feedback/vocabulary grading at **320, 390 and 1440 px**, seven game interactions and OBJ WebGL initialization. Isolated fixture transport; no production account/content writes. [Machine-readable browser evidence](docs/system-audit/prd-ui-verification.json).
- TypeScript check: no errors. ESLint: **0 errors, 39 warnings**; warnings remain recorded rather than hidden.
- Packaged web UI: TypeScript/Vite build passed; bundle-size warnings remain. This is not an Android/iOS signed-device test.
- Prisma client regenerated. A private database snapshot was created before applying `20261026190000_prd_game_rooms` and `20261026190100_prd_research_catalog`. Follow-up status reports the configured database **up to date**. Snapshot excludes Cloudinary file bytes.
- Live media-provider smoke test used only the public application icon and failed with **HTTP 429, provider quota reached**. No private cultural material was sent. Live assistance quality and illustration generation remain unverified until quota is available.
- Final production build: **passed, exit 0**, including static generation, type validation, optimization and build traces. [Release verification record](docs/system-audit/prd-verification-2026-10-27.md).
- Real PostgreSQL multiplayer integration: room creation/join, host authorization, hidden answers, server grading, progress SQL and duplicate submissions passed. All fixture writes ran inside a transaction that was rolled back; fixture accounts were confirmed absent afterward.

### Remaining acceptance work

Only the custom speech/pronunciation/voice and culturally accurate reconstruction/classification research described above is deferred for training-data availability. The following are separate prerequisites, not data deferrals: provider quota/configuration, authentic reviewed holdings and fluent interface translations, target-user accessibility/usability review, representative performance/security evaluation, Cloudinary backup/restore rehearsal, Android/iOS signing/device testing, store verification and stakeholder acceptance. The PRD is not honestly 100% accepted while those remain.

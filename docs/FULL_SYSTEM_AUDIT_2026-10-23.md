# Luo Heritage full-system audit — 23 October 2026

The assessment treats the supplied requirements as one product: web, Android and iOS must provide equivalent capabilities, accounts, permissions, content and outcomes. Historical phase names are retained only when identifying source documents. A working screen, seeded module name, build or test does not by itself constitute a completed feature.

## Completion estimate

**Approximately 30% built; approximately 70% remains for the complete requested product.** A reasonable judgment range is 25–35% built, pending detailed acceptance criteria and real-device/service testing. This is an engineering scope estimate, not measured development hours, contractual certification, or a claim that 30% has passed production acceptance.

The explicit weighted assessment below produces **28.5/100 implementation points**, rounded to 30% to avoid false precision. Credit covers implemented foundations and partial functionality; missing content, incomplete journeys and unverified services prevent full credit. Weights and coverage are reviewer judgments, published so they can be revised. A different weighting of advanced AI, learning or formal NRF work will change the total.

| Workstream | Weight | Estimated implemented coverage | Earned points |
|---|---:|---:|---:|
| Eight core cultural modules, content CRUD, search and review foundations | 24 | 50% | 12.0 |
| AI language tutor and evaluated speech/translation capabilities | 8 | 0% | 0.0 |
| Chatbot, retrieval, conversation management and feedback | 6 | 65% | 3.9 |
| Games and gamification | 6 | 5% | 0.3 |
| Learning centre, curriculum, saves and synchronized progress | 8 | 0% | 0.0 |
| Functional cultural calendar | 3 | 10% | 0.3 |
| Full audiovisual library | 4 | 20% | 0.8 |
| Research portal and dataset workflows | 7 | 30% | 2.1 |
| Complete identity, recovery, deletion and security journeys | 6 | 50% | 3.0 |
| Equivalent complete web/Android/iOS journeys | 8 | 35% | 2.8 |
| Offline packs, persistent queues and synchronization | 6 | 0% | 0.0 |
| Transactional communication, push and preferences | 3 | 20% | 0.6 |
| Formal NRF governance, lineage and withdrawal | 5 | 30% | 1.5 |
| Production operations, native release and acceptance | 4 | 25% | 1.0 |
| Approved launch inventory and content acceptance | 2 | 10% | 0.2 |
| **Total** | **100** | | **28.5** |

The eight-module score includes shared administration and repository foundations; it does not mean half the required public content is available. Content functionality also constrains the individual module scores. This is not a count of files or an average of three separate applications: the clients reuse substantial backend and presentation code.

## Evidence and boundaries

Reviewed the PRD, manager message, funding request, progress report, mobile proposal, short Activity 3.1.1 specification, formal technical specification, and formal data-model annex. Readable PDF/Word text was extracted locally. The scanned `Initial Request.pdf` did not yield substantive text and was not independently interpreted through OCR; administrative permits do not establish implemented product features.

The reference folder contains **418 files / 1,772,274,068 bytes**. Inventoried loose files and all six loose ZIP archives, inspected the structured NLP package, and compared relevant source, schema, routes, native projects, build configuration and tests. This is not linguistic verification of every interview or visual identification of every image. Historical reviews were used as pointers and checked against current code/database where reported as current findings.

Read the existing configured database through an explicit **read-only transaction**. No migrations, seeds, resets, publication changes, account changes or content writes were performed by that inventory. The inventory reports aggregates only. Synthetic diagnostic data was used for the transcript privacy reproduction.

Application source was not changed. Existing user edits were preserved. Build commands regenerate local build artifacts. This audit does not certify live production deployment, penetration resistance, a complete accessibility audit, real-provider delivery or every device journey. Unknown/unverified behavior is distinguished from a demonstrated defect or missing implementation.

## Current database inventory

| Area | Current observation | User-facing consequence |
|---|---|---|
| Languages | Luo and English active | Additional language rows/configuration would still require translated UI and reviewed content. |
| Dictionary | **0 entries** and no dictionary cultural records | No usable populated dictionary in this configured database. |
| Proverbs, riddles, folktales, heritage sites | No records in these modules | Their public learning/search experiences cannot be accepted with this inventory. |
| Oral histories | 26 submitted, research-only/internal records; 2,708 transcript segments | Valuable research material, not approved public stories or downloadable lessons. |
| Songs | Four submitted and four needing edits; all pending/internal | Eight records require correction/permission/review, and there is no recorded audio inventory. |
| Artifacts | 44 submitted, one validated/internal, one published/public-excerpt/public | One record has public publication/access flags. Actual consent evidence still requires human validation. |
| Media | **51 images; zero audio; zero video** | No populated pronunciation, listening, song audio or video library. |
| Embeddings | 2 rows | A small retrieval index; not evidence of comprehensive corpus search or a trained Dholuo model. |
| Learning/games/tutor | All three modules explicitly have `isStub=true` | Hidden by public non-stub module queries; not complete products. |

These counts are for the workspace's configured database, not every possible deployed environment. A row's absence means unavailable content here; it does not prove the corresponding form or API is broken.

## All fifteen PRD modules

| Module | Implementation evidence | Remaining full-scope requirements |
|---|---|---|
| 1. Dictionary | Dedicated schema, public search, forms/APIs; generic shared library projection | Reviewed vocabulary, meanings/examples, pronunciation recordings, translations, synonyms/antonyms/origin/grammar throughout equivalent client journeys. No current entries. |
| 2. Proverbs | Public cards, search, forms and review paths | Populate approved original text, literal translation, interpretation, context, related proverbs, narration/video; complete native detail parity. |
| 3. Oral history | Records/transcripts, location maps, versions and curator tools | Approved public excerpts, properly linked recordings, clan/migration narratives, participant/community governance, complete researcher/native workflows. |
| 4. Folktales | Dedicated story pages/forms | Approved stories/translations/narration, children's versions, teacher notes, characters/morals, illustrations and animation. |
| 5. Songs | Structured fields, pages and submitted content | Complete review, translations/meaning, approved recordings, notation/instruments/context and playback on all clients. |
| 6. Riddles | Web quiz and content components | Approved questions/answers, persisted attempts/progress, game mechanics and multiplayer challenge. A transient quiz is partial credit only. |
| 7. Artifacts | Images, descriptions, forms and gallery | Reviewed museum inventory and metadata; functioning detail interactions everywhere; reconstructed models/3D and recognition need separate assets, code and evaluation. |
| 8. Heritage sites | Site pages and Leaflet map components | Reviewed sites/GPS policy, images/history/stories/tourism information and actual virtual tours. No current site records. |
| 9. AI language tutor | Explicit stub | Guided tutoring, speech recognition, pronunciation correction, vocabulary practice, grammar/writing assistance, story generation and evaluated translation. Chat alone does not complete this module. |
| 10. AI chatbot | Shared chat component, RAG, sources, history/actions, feedback, quotas and processing permission | Live-provider acceptance, expert cultural accuracy, suitable recommendations/quizzing/translation, reliable latency and failure behavior, complete source navigation and approved content. |
| 11. Games | Explicit stub; limited riddle quiz elsewhere | Vocabulary races, puzzles, memory games, proverb/story challenges, treasure hunts, artifact identification, language battles and multiplayer state. |
| 12. Learning centre | Explicit stub | Beginner/intermediate/advanced curriculum; speaking/listening/reading/writing exercises; saved items, attempts/progress, resumption and cross-device synchronization. |
| 13. Cultural calendar | Module metadata and generic library support | Real events with dates/time zones/recurrence as needed, event editor, ceremony/festival/anniversary views and reminders. A content feed does not implement a calendar. |
| 14. Audiovisual library | Media upload/delivery and shared HTML audio/video elements | Actual permission-cleared podcasts/interviews/songs/speeches/documentaries/lectures, discovery, playback, captions/transcripts and controlled downloads. |
| 15. Research portal | Staff transcript, export, audit and metadata foundations | Complete researcher/custodian workspaces, publications/reports/field notes, immutable datasets/releases, lineage, annotations, protected identities and governed export. |

## Platform parity

| Journey | Web | Android | iOS |
|---|---|---|---|
| Public dashboard/library | Implemented with bounded shared query | Same bundled presentation/query | Same bundled presentation/query |
| Chat and saved conversations | Shared component/services | Bundled shared screens | Bundled shared screens |
| Login/session | Browser credentials/Google | Browser bridge, PKCE, secure persistence and renewal code | Browser bridge, Keychain persistence and renewal code |
| Profile/contribution/submissions | Web routes exist | Opens web host outside bundled screen set | Opens web host outside bundled screen set |
| Administration/review/research | Substantial web implementation | Browser destination; no complete bundled staff workflow | Browser destination; no complete bundled staff workflow |
| Rich cultural detail/maps/quiz | Dedicated web routes exist | Many links leave app for website | Many links leave app for website |
| Lessons/games/tutor/offline | Incomplete/missing | Incomplete/missing | Incomplete/missing |
| Native capture/push | Some browser recording/upload code | No equivalent complete native capture/push implementation | No equivalent complete native capture/push implementation |
| Release acceptance | Local build/tests are not live acceptance | Development project/APK, no demonstrated store release | Source project; compilation and real iPhone acceptance still needed |

The native `Link` component bundles only dashboard URLs, `/account`, and chatbot URLs. Other destinations become absolute backend links with `target="_blank"`. Therefore common styling on the three bundled areas does not establish whole-system parity. Opening a browser also introduces a separate browser session; a native bearer session is not automatically a browser cookie session.

Secure storage/renewal **has been implemented**, contrary to older paragraphs in the mobile README/checklists. Android uses a custom protected-storage plugin and iOS uses Keychain. Tests cover rotation, restart recovery and revocation handling with mocks. Those are real implementation gains, but real-device restart/expiry/offline sign-out and iPhone acceptance remain necessary. Do not report these features as entirely absent.

## Confirmed defects and incomplete visible behavior

| ID / priority | Finding and evidence | Required correction / acceptance |
|---|---|---|
| F01 — High | `src/app/api/transcripts/[id]/route.ts`: an ordinary authenticated reader of an eligible public transcript receives the complete transcript plus parent record. Guest responses use an explicit restricted projection. A synthetic execution of the actual handler returned speaker, location, source URI/reference and parent record for a role-less signed-in reader. | Apply field-level projections based on authorization, independent of login alone. Prove that public readers, signed in or out, cannot receive protected identity/location/source fields. This reproduction does not claim a private real transcript was leaked. |
| F02 — High | `login-form.tsx` password reset, Apple, Microsoft and phone actions call `comingSoon`; registration Apple/Microsoft also remain placeholders. | Implement the advertised flows and recovery delivery, or revise release scope/UI explicitly. Current buttons do not perform their advertised account operation. |
| F03 — High | Consumer self-deletion is absent: the user DELETE route permits only the Master Super Admin and rejects self-deletion. | Build identity-verified consumer deletion/request, provider/session revocation, governed retention and user-visible completion. Administrative deletion is a different journey. |
| F04 — High | Mobile `main.tsx` routes profile/contributions/staff and rich public details to website destinations. | Complete equivalent authorized journeys and test session continuity, back navigation and role behavior on Android/iPhone. |
| F05 — Medium | `public-library.ts` caps records at 50 and dictionary entries at 100; versioned library has no continuation mechanism. | Add pagination/search with stable cursors, loading/error handling and equivalent filters. Older records become inaccessible through this feed once limits are exceeded. |
| F06 — Medium | `public-library.ts` projects summaries; fallback record text is cut to 700 characters. Full module-specific data is not delivered through that projection. Shared feed “See more” only expands the supplied summary. | Provide complete detail endpoints/screens with governed fields and media. Expanding text must allow access to the full permitted content. |
| F07 — Medium | `GridView` in `shared/module-content-view.tsx` renders pointer-styled cards as plain divs without a link, button or activation handler. Grid audio/video indicators do not provide playback. | Add keyboard-accessible detail/media activation. Test clicks, touch and keyboard in all clients. Feed playback elements already exist. |
| F08 — Medium | Uploads use 6 MB chunks, but upload ID/offset live inside one function; failure throws. There is no persisted transfer queue/restart recovery. | Implement resumable transfer state, controlled retries, progress and duplicate/finalization handling. Chunking is present; durable resumability is not. |
| F09 — Medium | Mobile API origin defaults to localhost; app identifier is development-only; native build script explicitly rejects release mode. | Configure a reachable deployed HTTPS backend, institutional identifiers/signing, reproducible release pipeline and actual device acceptance. Localhost only works with explicit development arrangements. |
| F10 — Medium | Full UI language consistency is incomplete: shared/mobile labels such as “Sign in”, “Create account”, “My account”, “Try again” remain English while culture-language selection changes metadata/content. | Localize the complete interface and validate language persistence, fallback and equivalent wording on each client. |
| F11 — Medium | 28 web lint warnings concern unoptimized images; generic library fetches bounded full lists; mobile reads allow a 40-second deadline. | Measure actual page/search performance and optimize delivery. A timeout value is not proof of measured latency or a failed SLA. |
| F12 — High before repository sharing | Two historical database backups remain tracked under `data/exports/backups`, despite ignore rules. Confirmed with `git ls-files`; contents were not reproduced. | Privately assess contents/access/history, agree cleanup and rotate credentials only if exposure is established. A tracked backup is a review risk, not proof of an exploited breach. |
| F13 — Medium / environment | The current built mobile browser preview at `127.0.0.1:4173` fails with “Failed to fetch” and times out loading the overview. Direct bootstrap returns 200, but a request with that Origin receives no `Access-Control-Allow-Origin`. | Configure the documented preview-origin allowlist on the backend, restart and repeat the browser smoke check. This is a demonstrated current preview configuration failure; standard Capacitor origins follow separate rules and are not proven broken by this result. Later mobile browser interactions were not reached. |
| F14 — Medium / parity | Web `/` redirects signed-out visitors to login, and bare `/luo` and `/eng` redirect there; the mobile default dashboard permits anonymous browsing. Deeper language-library paths are permitted by web middleware. | Provide a consistent guest entry/navigation policy and visible access to the approved public library on all platforms. This is an entry-flow mismatch, not a claim that every public web URL requires login. |

## Missing cross-cutting capabilities

- **Offline:** no completed versioned downloadable packs, persistent content database/search, controlled offline media, restart-safe queued writes, operation IDs, conflict rules, withdrawal refresh or transfer recovery. Sidebar preferences and secure authentication storage do not implement offline learning.
- **Learning synchronization:** the current Prisma schema has no dedicated lesson, quiz-attempt, progress, bookmark or offline-pack model, and no equivalent persistent implementation was found elsewhere in application source.
- **Communications:** database notifications and an email adapter/settings/test route exist. Complete Android/iPhone push registration, preferences, delivery tracking and actual verification/reset workflows are absent. No completed phone OTP/SMS journey was found. SMS remains conditional in the proposal; full product acceptance must explicitly record whether it is required.
- **Native capture:** browser `getUserMedia`/`MediaRecorder` and file uploads exist in the contribution form. The bundled clients lack complete native camera/recording/capture workflows, permission handling and persisted upload recovery. Android's main manifest declares Internet only; iOS lacks camera/microphone usage descriptions for those future workflows.
- **Security:** current role/publication/consent protections have substantial test coverage. JOOUST SSO/OIDC, elevated-role MFA, full device/session management, complete account verification and source/community ABAC remain unfinished. No authentication throttling implementation was found in the inspected credentials/registration paths; abuse-control acceptance is needed.
- **Analytics:** event aggregation, search/content/AI metrics exist. Complete learning progress, download/engagement metrics and reliable geographic attribution cannot be claimed from the current general event schema and partial instrumentation.
- **Operations:** manual DB/media backup and restore tools exist. They do not establish scheduled daily incremental/weekly full jobs, measured recovery, monitoring, crash reporting, capacity/load acceptance or formal handover.

## AI and source-data readiness

The supplied archive has useful material, but it cannot complete the application simply by being imported.

- 282 loose image files reduce to **101 distinct SHA-256 hashes**. This is byte deduplication, not the number of distinct artifacts.
- `Data.zip` contains 354 files, including the NLP package absent from the extracted folder's visible inventory.
- The packaged corpus contains **2,708 rows**, all `research_only/internal`, all `translation_available=false`. It cannot be treated as an approved parallel translation dataset or public lesson collection.
- No audio/video extensions were found in the inventoried loose files or six loose archive inventories. Original recordings and explicit processing/public/download permissions still need to be supplied and reviewed.
- The normalized image dataset contains **47 JPG files** with classification metadata. Earlier claims that no labeled dataset exists are too broad. A small dataset does not prove a deployed, accurate recognition model.
- RAG/embeddings, summarization and entity extraction code exist. `summarize.ts` already extracts entities through Gemini; NER is partial implementation requiring evaluation/curation, not completely absent.
- OCR, dependable STT/TTS, pronunciation scoring, evaluated translation/grammar, deployed artifact recognition, knowledge relationships, model training/versioning and immersive outputs are not completed by the existing chat integration.
- `rag.ts` uses configured primary/fallback Gemini models. This audit did not independently verify live provider availability, billing or model quality; those are unverified, not declared broken because of model names.
- Prompt instructions and citations do not guarantee factual correctness. Expert review must measure cultural accuracy, unsupported claims, source appropriateness, translation quality and permission leakage on approved examples.

## Formal repository requirements

The short Activity 3.1.1 document allows more flexible hosting language. The expanded **23 July 2026** technical and data-model annexes explicitly require on-premises core services, storage, inference and backups. Existing Neon/Cloudinary/Gemini dependencies are development foundations; they do not satisfy that final boundary. Existing authorization to use cloud development and defer migration is compatible with continuing development, but does not remove the final acceptance requirement.

The current schema has cultural records, media, transcripts, consent-to-asset links, provenance/history, training datasets and embeddings. It does not implement the complete formal entity relationships for protected participant identities, Agent/Participation/Session, distinct CommunityProtocol/RestrictionDecision, WithdrawalCase, immutable derivatives/releases, training runs/models/index lineage, retention and tombstones. Similar field names are partial credit only. Source-dependent cascade deletion needs review before immutable lineage is introduced.

| Annex acceptance criteria | Assessment |
|---|---|
| AT-01 ingest and technical metadata | Partial implementation; witnessed ingest/checksum/metadata acceptance remains. |
| AT-02 object/role/attribute access | Partial; existing tests are useful, full community/purpose/site rules and F01 remain. |
| AT-03 permission-aware filtered search | Partial; complete filter/index and role matrix not accepted. |
| AT-04 transcript revision provenance | Partial; history exists, complete reproducible version/source model remains. |
| AT-05 governed NLP/CV/metadata exports | Partial; APIs exist. Caption classification JSON/CSV is not bounding-box detection annotation. |
| AT-06 custodian approve/revise/restrict workspace | Partial web review paths; complete governed decisions and platform parity remain. |
| AT-07 public consent + restriction + approval | Substantial implementation/test credit; real content/consent acceptance remains. |
| AT-08 metadata ≤2s / semantic ≤5s | Unverified against representative data and load. |
| AT-09 20-user baseline / path to 100+ | Unverified. |
| AT-10 daily incremental/weekly full local backup | Not demonstrated by manual scripts. |
| AT-11 DB + ten assets restored in 48–72 hours | No current witnessed restore performed. |
| AT-12 TLS, at-rest encryption, MFA, least privilege | Partial; complete production configuration/MFA acceptance remains. |
| AT-13 auth/access/restriction/export auditing | Partial instrumentation; full event coverage and protection not certified. |
| AT-14 external-network isolation | Current cloud dependencies prevent claiming compliance. |
| AC-DM-01 asset-consent M:N + separate community protocols | Partial: junction exists; complete protocol model/validity does not. |
| AC-DM-02 enforced metadata/protected attributes | Partial validation; full controlled vocabulary/protection remains. |
| AC-DM-03 canonical keys, paths and checksums | Partial; canonical storage/fixity must be reconciled with annex. |
| AC-DM-04 withdrawal propagation | Missing complete source→derivative→release→dataset→index propagation. |
| AC-DM-05 immutable reproducible versions | Partial history; not complete immutable object/release/model versioning. |
| AC-DM-06 protected identity/GPS/consent | Partial; F01 demonstrates field projection weakness. |
| AC-DM-07 most-restrictive group permissions | Missing complete group/community rule evaluation. |
| AC-DM-08 exact dataset/model/source lineage | Missing complete reproducible lineage and eligibility decisions. |
| AC-DM-09 witnessed on-premises restore | Unverified. |
| AC-DM-10 operation without public cloud | Not satisfied by current architecture. |

## Verification performed

See `system-audit/` for aggregate inventory, synthetic diagnostic and execution logs.

| Check | Result and limits |
|---|---|
| Regression suite | **108/108 passed**, `node --test --test-isolation=none tests/*.test.cjs`. Default isolated invocation was blocked by sandbox `spawn EPERM`; that is an execution restriction, not 15 independent application failures. |
| Root TypeScript | **Passed**, `npm run typecheck`. |
| Web lint | **0 errors / 28 warnings**, invoked by web build. |
| Mobile TypeScript + Vite production bundle | **Passed outside sandbox**, `npm --prefix clients/mobile run build`. Initial restricted run could not load native build dependencies. |
| Database | Current aggregate inventory succeeded in read-only transaction; initial sandbox connection restriction was bypassed through authorized tool escalation. |
| Transcript field projection | Confirmed synthetic reproduction of F01 using actual handler and mocked dependencies; no private content accessed. |
| Web browser entry | **Passed** existing `smoke-navigation.cjs --entry`: root/Luo/English entry routing, registration access and login/registration phone layouts. This validates implemented entry behavior, not completion of guest-parity requirements. |
| Live local APIs | Bootstrap **200**, artifact library **200 / one item**, anonymous account **401**. No AI call or content submission. |
| Mobile browser preview | **Failed** existing `smoke-mobile.cjs` at live bootstrap/overview: “Failed to fetch”, zero recorded app exceptions. Separate Origin probe confirmed missing CORS response header for the preview origin; see F13. Subsequent library/navigation/retry/chat assertions were not reached and are not counted as passed. |
| Web production build | **Passed outside sandbox**, `npm run build`; compiled, checked types, generated 44 static pages and completed optimization/tracing. The initial sandbox run failed with `spawn EPERM`. A module-format warning also references `tailwind.config.ts`; it did not fail the build. |
| Android development compile/lint | **Passed**, cached/offline Gradle `:app:assembleDebug :app:lintDebug`, 205 tasks, 6m26s. App lint: **0 errors / 27 warnings**. Uses existing synchronized assets; the 20 shared bundle files match current Vite output and iOS; Android additionally has generated Cordova bridge files. Not a signed release or fresh phone acceptance. |
| iOS | Source and Keychain code inspected; **not compiled or device-tested** on this Windows host. |
| Actual external services/devices | Google OAuth, Gemini, email/SMS/push delivery, phone restart/expiry and iPhone/store journeys **not certified by this audit**. |

Tests load actual TypeScript with mocked database/provider/native dependencies (`tests/load-ts.cjs`). Passing them is useful regression evidence, not proof of live provider or OS behavior. No fresh full-system browser/device acceptance is claimed from unit tests.

Primary implementation references: [mobile routing](../clients/mobile/src/main.tsx), [library projection](../src/lib/public-library.ts), [shared content interactions](../src/components/shared/module-content-view.tsx), [transcript access](../src/app/api/transcripts/[id]/route.ts), [schema](../prisma/schema.prisma), [login actions](../src/components/forms/login-form.tsx), [native sessions](../src/lib/native-login-client.ts), [governance](../src/lib/governance.ts), [release gate](../clients/mobile/scripts/build-native.mjs), [AI retrieval](../src/lib/ai/rag.ts).

## Completion order and definition of done

1. Correct privacy projection, account placeholders/recovery/deletion and incomplete detail/grid access. Establish one acceptance matrix covering every PRD requirement, actor and platform.
2. Complete the shared API/detail/session contracts and equivalent contribution/review/profile journeys. Confirm device builds against the reachable HTTPS backend.
3. Curate approved launch content, recordings and translations through existing review controls; never publish research-only interviews to fill empty modules.
4. Build lessons, saves, attempts/progress, full games and calendar. Implement persistent offline storage, queues and synchronization with restart/interruption/conflict tests.
5. Complete native capture, communications and evaluated AI capabilities. Prepare data/permission/evaluation evidence alongside each feature.
6. Implement remaining formal governance/lineage/withdrawal and university operations, migrate under a tested rollback plan, and demonstrate backup restoration and network isolation.
7. Complete equivalent Android/iPhone/web user acceptance, performance/load/security/accessibility checks, signed releases, deployment and institutional handover.

For completion, the same account and role must accomplish each authorized task on all three platforms, retain permitted state after restart/reconnection, see the same approved data, receive the same permission decisions, and get usable failure/recovery behavior. Differences in native OS controls are acceptable; missing tasks and browser-session breaks are not equivalent delivery. Full scope must remain open until those outcomes and the formal repository evidence are accepted.

# Luo Heritage: what is done and what remains

> Latest identity increment, 14 October 2026: protected Android/iOS storage adapters, restart recovery, rotating session renewal and protected offline sign-out retry are implemented. See [current scope and limits](PHASE_TWO_NATIVE_SESSION_RENEWAL.md) and the delivery plan. Earlier memory-only descriptions below are historical. iPhone compilation/testing, deployed HTTPS acceptance, session management, recovery/verification and full-scope development remain outstanding.

Checked against the current workspace and delivery records on 12 October 2026. This is the plain-language starting checklist. The detailed requirement evidence remains in [PHASE_TWO_SCOPE_REVIEW.md](PHASE_TWO_SCOPE_REVIEW.md).

**Current position:** Phase One has a working web foundation, with content and final acceptance still outstanding. Phase Two has a tested shared library, a native sign-in proof, shared account/history screens and a shared chat interface with owner-only message/actions APIs. An Android development APK is installed and its public library/navigation/layout/retry and signed-out boundaries passed on the USB phone. The complete Android/iOS applications and full PRD/NRF scope are not finished. Adding store credentials today would not complete them.

**Confirmed scope:** finish the complete PRD/NRF scope, with the extended deadline. Use the existing cloud database for development/testing and preserve all existing records. Move to JOOUST later. Web, Android and iOS must share accounts, data, permissions, interface designs and button behavior.

## 1. Phase One — already built

| Area | What exists | What the current evidence proves |
|---|---|---|
| Website | Luo Heritage branding, login/registration screens, responsive public and administrative layouts | The production web build passed; browser entry/navigation checks passed. |
| Accounts | Email/password registration/login, Google web sign-in integration, roles and account status checks | Role/revocation tests passed. Every external sign-in provider still needs final real-account acceptance checks; Apple/Microsoft/phone/reset remain unfinished. |
| Navigation | Public, admin and super-admin destinations; contribution links; collapsible sidebars | Browser checks passed for the repaired contribution links, dashboard switching and sidebar navigation. |
| Cultural library | Screens, forms and database/API support for dictionary, proverbs, riddles, stories, songs, artifacts and heritage sites | The structure exists. This does not mean every module contains approved launch content. |
| Contributions | Structured forms and draft/submission/review/publishing workflow | Form opening/required-field checks and workflow authorization tests passed. Full live acceptance across the complete workflow still needs recording. |
| Media and research text | Media access/upload foundations, image records, staff transcript tools and imported research text | The last database review found 51 images and 2,708 transcript segments. These are not public audio/video or language-learning recordings. |
| Protection and history | Publication/consent restrictions, role checks, review history and audit/provenance/version fields | Existing regression tests cover several access boundaries. Complete formal NRF governance remains additional work. |
| AI | Source-grounded chatbot/search implementation, conversations and feedback | Implementation exists. Expert accuracy checks and real-provider acceptance remain; no completed trained Dholuo model is claimed. |
| Browser installation | Installable website, shared icons and update notices | Browser installation/update checks passed. This is separate from store-distributed Android/iOS releases. |
| Operations | Working deployment foundation and manual database/media backup/restore tools | Code/tests exist; scheduled operations and witnessed restore/load/security acceptance remain. |

## 2. Phase One — still needed to close it

- Agree the minimum approved content required in each funded core module.
- Prepare and approve dictionary entries, proverbs, riddles and public story excerpts. The last database review found these public collections largely empty, with one publicly eligible artifact.
- Obtain permission-cleared pronunciation, song and story recordings. The reviewed collection had no audio/video records; English translation cells in the prepared text corpus were blank.
- Check source rights, sensitive material, duplicate sources, language labels and translations with the content reviewers. Imported research-only interviews must remain protected.
- Witness the complete real workflow: register/login, search/read, contribute/upload, review, approve/publish and confirm public visibility. Include failure and permission-denial cases.
- Verify live Google login, AI responses and provider behavior; remove or complete unfinished actions before releasing them to users.
- Improve slow loading and image delivery, measure performance, schedule backups and demonstrate restoration.
- Review the historical backup files already tracked in Git, address any exposure privately, and finish security/privacy checks.
- Record university/content-owner acceptance and hand over the website, source and operating instructions.

Some gaps above are being completed in the wider Phase Two work. They are listed here because Phase One cannot be called fully accepted while they remain unresolved.

## 3. Phase Two — already done

- The full-scope delivery plan and store-account walkthrough are written.
- Common navigation destinations and content-filter definitions are shared by the clients.
- The backend has public app-configuration and public-library APIs.
- The web dashboard and mobile preview use the same public-library query service and publication/access rules.
- Actual overview, sidebar and content presentation components have been shared, together with the design CSS, fonts and icon.
- An isolated mobile project contains React, Vite and Capacitor packages/configuration.
- Its browser preview can read real published content, change language, switch content views, collapse/open the sidebar and recover from a lost connection.
- Existing database records have been preserved. No schema migration, reset, reseeding or publication of research-only records was performed for this increment.

**Latest recorded checks:** 88 automated tests passed, including shared chat ownership, processing permission, failures, pagination, origin separation, bounded navigation caching and existing native/account controls. The shared mobile production bundle and Android/iOS asset synchronization passed; all twenty bundle files matched across platforms. The browser proof passed library/navigation/network recovery plus the shared chat consent/failure/retry/source-link/mobile-layout checks (AI transport intercepted). Final web-build/live API evidence is recorded in the delivery plan. The current lint check has 28 existing image warnings and no errors. These checks cover the implemented increment, not the complete documents or real-device acceptance.

**Later Android device checks:** the updated APK compiled and passed Android lint with zero errors/27 warnings. On the unlocked Android 10 USB phone, visible branding/layout, live public library, sidebar, language/view controls, connection retry and signed-out chat/account boundaries passed. The small-screen header was corrected and missing USB forwarding is now detected immediately. Cloud connection stability/loading speed, authenticated native acceptance, iPhone testing and the full document requirements remain open. See the latest delivery-plan entry for the failures encountered and the exact test limits.

**Latest login update:** 92 regression tests and the web/mobile/Android builds passed. The explicit Android USB debug build now opens the same login/registration forms as the website; registration keeps its return link to the app. The actual phone Sign in button opened the login form, and the user is completing the manual return/account-history check. Release USB authentication was verified disabled in compiled Java code. Store/distributed builds still require the current backend deployed over HTTPS; persistent login, complete identity features and iPhone acceptance remain unfinished.

**Important limitation:** installed clients now have a system-browser sign-in bridge, bundled account/history and shared chat screens, while contributions and other unbundled destinations open the website. The browser preview still signs in through the website. Persistent secure sessions/refresh, compiled/signed releases and native-device acceptance remain outstanding. The new APIs have not been deployed to the previous live production site. See [shared chat scope](PHASE_TWO_SHARED_CHAT.md) and [configuration locations](PHASE_TWO_CONFIGURATION_GUIDE.md).

## 4. Phase Two — all remaining development

| Work | What must be completed |
|---|---|
| Real Android/iOS apps | Platform projects are generated; complete all shared screens, menus, role-based administration, app icons/splash, links, accessibility and OS permissions. Build installable development apps and release packages. |
| Accounts on all platforms | Validate the implemented protected storage/renewal, login/logout/expiry/revocation on actual devices and a reachable HTTPS backend. Complete session management and expired-row cleanup. Complete verification/password reset, required Apple login, self-deletion and Microsoft/phone flows; complete elevated-role SSO/MFA. |
| All fifteen PRD modules | Finish the module work in the table below; a module name or empty screen is not completion. |
| Learning and personal records | Lessons, exercises, quizzes, saved items, progress, teacher/age suitability and consistent progress across devices. |
| Offline use | Approved downloadable packs, local storage/search/playback, restart recovery, queued actions, interrupted transfers, duplicate prevention and conflict handling. Apply rights/withdrawal rules. |
| Contributions on phones | Camera/gallery/files/audio recording, private drafts, consent capture, resumable uploads, review status and permission-denial behavior. |
| Communications | Device registration, push preferences, Android/iPhone push, email verification/reset, retries and delivery records; SMS if included in the selected delivery. |
| AI capabilities | Finish and evaluate the document's tutoring/language-model work, translation, speech recognition/pronunciation, text-to-speech, OCR, artifact recognition, identifying names/places in text, semantic search, question answering and source relationships/knowledge links. Obtain approved training/evaluation data and enforce processing rights. |
| Full NRF repository | Protected identities; source/session/participant relationships; individual and community consent; strict inherited permissions; ingest validation; checksums; versioned transcripts/annotations; immutable datasets/releases; model/index history; withdrawal propagation and governed researcher exports. |
| Safe deployment and operations | Separate development/testing/release configurations while preserving the existing database; backup before schema changes; checked migrations; durable background processing, secrets, monitoring, scheduled backups and tested restore/rollback. Deploy the new APIs and completed web features. |
| Complete testing | Real Android/iPhone tests, account-role parity, all buttons/journeys, offline restarts/sync, permissions, security/privacy, accessibility, provider delivery, AI quality, load/speed and the document acceptance cases. |
| Later JOOUST migration | Prepare and then validate university-local database/media/search/inference/SSO/backups, migration and recovery. This remains a separate milestone under the user's decision. |
| Release preparation | Permanent institution-owned app identifiers, release signing configuration, automated builds, privacy/deletion/support pages, screenshots/listings, reviewer access, internal testing/TestFlight and submission preparation. |

### All fifteen modules

| Module | Existing base | Remaining for the full requested scope |
|---|---|---|
| Dictionary | Web screens/forms/API | Reviewed words, examples/grammar, translations, pronunciation, learning links and complete mobile/offline behavior. |
| Proverbs | Web screens/forms/API | Approved entries, interpretation/context, translations and complete mobile/offline behavior. |
| Riddles | Web screens/forms and limited quiz | Approved questions/answers, full attempts/progress and complete mobile/offline behavior. |
| Oral histories | Protected imported interviews/transcripts | Approved public excerpts; linked source versions, recordings and complete authorized research/mobile use. |
| Folktales | Web screens/forms | Approved stories, age suitability, translations/narration and document-required animation features. |
| Traditional songs | Internal submissions/media foundation | Recording and publication rights, actual audio, lyrics/meanings/translations and mobile use. |
| Cultural artifacts | Images and one publicly eligible record | Full curated museum information, evaluated recognition and required 3D/AR assets/features. |
| Heritage sites | Web/map foundation | Approved histories/locations, tours and native/offline map behavior. |
| AI language tutor | Unfinished placeholder | Guided teaching, grammar/writing help, speech/pronunciation practice and evaluated feedback. |
| AI chatbot | Web implementation | Expert evaluation, full mobile interface, source navigation and tested provider/local-inference handling. |
| Games | Unfinished placeholder | Complete game/reward/progress features, including the document's multiplayer scope; starter quizzes do not cover it all. |
| Learning centre | Unfinished placeholder | Approved curriculum, lessons/exercises/attempts, saved items and progress/offline resume. |
| Cultural calendar | Generic module entry | Event data/editor, dates, calendars and reminders. |
| Audio/video library | Public media aggregation; current records are images | Rights-cleared audio/video, captions/transcripts, playback and permitted downloads. |
| Research portal | Staff transcript/export foundations | Full governed researcher/custodian workspaces, source relationships, datasets/releases, analysis and exports. |

No item in this table is silently removed from the extended full scope. Content, model quality and immersive media require reviewed assets as well as code.

## 5. Technologies and environment setup

| Area | Current or planned tools | Setup status |
|---|---|---|
| Shared interface | React 18, TypeScript, Tailwind, local fonts/icons | Installed; shared foundation builds. More screens still need extraction/platform adapters. |
| Web/backend | Next.js 15, Auth.js, Prisma 6, Zod | Existing stack. Native sessions and additional data/API models remain. |
| Mobile packaging | Capacitor 8.5.3; Vite 8.3.4 | Packages/configuration installed; browser bundle builds. Native platform projects are generated; compilation/signing/device tests remain. |
| Development tools | VS Code, Git, Node.js, npm | This check found Node 24.15.0 and npm 11.12.1. These support the current build setup. |
| Development database | Existing cloud PostgreSQL/Neon; Prisma; vector search foundation | Existing records remain in use. New schema changes need backups and safe migration checks. Do not reset/reseed it. |
| Current media/AI | Cloudinary and public-content Gemini integration | Existing foundations. Final external-service delivery/quality checks remain; these do not establish formal on-premises NRF acceptance. |
| Android | Android Studio, API 36 SDK/build tools, Java 21 for this Gradle wrapper, emulator/real phone | Studio setup is complete and WHPX is usable. The updated development APK compiled, passed lint with zero errors/27 warnings and installed on the Android 10 USB phone. Visible branding/layout, public library, sidebar, language/view controls, connection retry and signed-out chat/account boundaries passed. HTTPS native account acceptance, persistent sessions, complete screens and releases remain pending. |
| iOS | macOS with Xcode 26+, command-line tools and Swift Package Manager, or a configured Mac build service; real iPhone | This workspace is Windows. The iOS source project is generated; no Mac build pipeline or signing setup is established. |
| Offline | Persistent local database such as SQLite, secure device storage and native file/media plugins | Design/plugin selection and implementation remain. Do not confuse the browser preview with working offline packs. |
| Communications | Android/iOS push service integration, transactional email and selected SMS service if included | Full device/delivery integration and institutional service configuration remain. Store credentials are separate from these provider credentials. |
| Automatic builds/testing | Existing Node regression tests and read-only Chrome checks; native CI builds, device/emulator tests and load tests still needed | Web/foundation checks work; native release pipelines are not configured. |
| Later NRF hosting | FastAPI or NestJS repository service as specified in the formal annex, PostgreSQL/PostGIS/pgvector, MinIO/NAS, SSO/MFA, local search/inference and separate backups | Not configured. Current Next.js is retained for the web; any final repository-service equivalent must be documented and accepted, or the specified service extracted. |

The current mobile approach is **shared React plus Capacitor**, replacing the earlier Expo/React Native recommendation. It is an implementation choice for the same-interface requirement; the PRD is not evidence that this toolchain or every feature is already installed.

Capacitor's current [environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup) specify Node 22+, the Android Studio/SDK setup and macOS/Xcode requirements; [Android](https://capacitorjs.com/docs/android) and [iOS](https://capacitorjs.com/docs/ios) document platform project creation and testing. A hosted Mac still provides a Mac environment; Windows alone does not produce a local iOS build.

### Configuration to prepare

- Server: existing database connection, authentication secret, public HTTPS host, allowed client origins, login callbacks, media/AI settings and institutional email/push/SMS settings. Keep all secret keys on the server or secure build system.
- Mobile: public API origin, permanent Android/iOS identifiers, app links/callbacks, native permissions and version numbers. VITE_* settings are public bundle contents and must not contain database/provider secrets.
- Development/testing: clearly identify test records/users and limit side effects in the existing database. Use a university-approved way of creating test data without altering research records.
- Release: institution-controlled signing, build runners, release variables, monitoring, policy/listing assets, test devices and tested backup/rollback instructions.

## 6. Where to start

1. Set up Android tools and access to a Mac build environment; use the generated platform projects and confirm installable development builds.
2. Validate the new native sign-in proof on devices; add protected persistent sessions/refresh. Finish recovery/deletion and test all role interfaces.
3. Bring the remaining screens/actions into the shared clients, add lesson/progress/save models safely and supply approved content.
4. Implement native capture/upload, offline storage/sync and communications.
5. Complete the full remaining AI, games, immersive and NRF repository features, with reviewed data and acceptance cases.
6. Measure/fix speed, security, accessibility, recovery and all real-device journeys; deploy and prepare signed releases.
7. Complete institutional store actions/testing/review. Perform JOOUST migration and formal local-only acceptance in the later agreed milestone.

## 7. What can remain at handover

The target is to finish application code, build automation, configuration templates, policies/listings and the tests possible with available services/devices. Document every requirement as passed or with its exact unresolved dependency. Do not mark the whole product ready from a successful browser bundle.

Even then, some institution-controlled work is more than entering credentials:

- Store organization enrollment, identity checks, legal agreement/payment, app identifiers, signing ownership, tester access and review responses. See [STORE_ACCOUNT_SETUP.md](STORE_ACCOUNT_SETUP.md).
- Real-service tests with authorized OAuth, email, push, AI and any SMS credentials; code-only tests cannot prove delivery.
- Approved cultural content, recordings/translations/consent and expert review.
- Real Android/iPhone acceptance and later JOOUST infrastructure/migration sign-off.

Credentials can connect a finished integration; they cannot create unfinished features, approved data, native toolchains or acceptance evidence. The account holder supplies private credentials through the secure configuration process, not chat.

The original status audit changed documentation only; the subsequent native-folder/account-history increment adds application code as listed below. No database schema or records were changed. Latest implementation results are in [PHASE_TWO_DELIVERY_PLAN.md](PHASE_TWO_DELIVERY_PLAN.md); historical aggregate content counts are review snapshots, not live guarantees.

Latest development increment: system-browser/PKCE native sign-in, hashed short-lived device sessions, per-device revocation, explicit bearer-only CORS, matching native callbacks/plugins and shared account/history screens are implemented. See [PHASE_TWO_NATIVE_SIGN_IN.md](PHASE_TWO_NATIVE_SIGN_IN.md) for limits and [PHASE_TWO_DELIVERY_PLAN.md](PHASE_TWO_DELIVERY_PLAN.md) for verification. Native device acceptance and secure persistent storage/refresh remain; complete phase two is still unfinished.

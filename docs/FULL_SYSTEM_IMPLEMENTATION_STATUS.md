# Full-system implementation status — 23 October 2026

This is one Luo Heritage system. The reference folder supplies requirements and research evidence; it is not runtime application code. The earlier 30/70 estimate described the full scope before this implementation. It must not be read as a claim that the remaining 70% is now complete.

## Implemented in this increment

- A shared application shell at **`/application`**, used by the Android/iOS bundle as well. Existing web routes remain available. Sign-in uses the platform's appropriate browser/session adapter.
- Public browsing, shared collection search and pagination, complete permitted text, keyboard-accessible grid details, media delivery through permission-checked application routes, and saved words/items.
- Shared contribution forms and native bearer access to the existing server authorization/workflow code. Native users can create/edit private drafts, upload attachments, record audio using supported browser/OS APIs, and submit through the existing workflow.
- Explicit device contribution drafts preserve text, source/access settings and selected File bytes in IndexedDB across offline app restarts. Copies are separated by backend/account/language; form definitions are cached without private server submissions. Users resume, save again or delete copies themselves. Acknowledged server IDs and completed file removals are kept for retries; there is no background transfer manager or guarantee against duplicate creation when a connection is lost before a create acknowledgement.
- A shared staff content workspace: queues, original-text editing, English translation, cultural checklist, correction requests, return to review, publishing review and review history. Existing administration screens remain available; this is not full native parity for every existing administrative tool.
- Persistent educational resources: lessons, quiz-based games and dated cultural events; beginner/intermediate/advanced and audience metadata; teacher notes and practice instructions; authoring, draft editing, independent review, publication and withdrawal.
- Server-side grading, per-user progress, best scores, attempt counts, saved lessons and version-aware completion. Clients cannot supply a trusted score or submit another account's queued work.
- Text-only offline packs with explicit download permission and seven-day expiry; version/withdrawal checks when online; IndexedDB queues that survive restart; idempotent server receipts and conflict messages. A dedicated public-only service worker supports restarting the web application offline. No account/API/private SSR responses are cached by that service worker.
- Shared profile, notification inbox and session controls. Revocation invalidates native refresh families; sign-out-all also invalidates browser JWTs using a session version.
- Real password-reset, email verification and confirmation-based consumer deletion flows, backed by hashed single-use expiring tokens. Institutional source/consent/audit retention is disclosed; deleting the Master Super Admin requires ownership transfer first.
- Configurable Apple and Microsoft Entra providers in addition to existing Google/credentials authentication. No automatic email-based cross-provider linking was added for Apple/Microsoft.
- SMS code integration for linking a phone and signing into an existing linked account, with expiring hashed codes and rate controls. Phone-only account registration is not implemented.
- Account request/login rate limits, protected transcript projections, and removal of internal identity/source/provider metadata from public record responses. Public media routes serialize database sizes safely.
- Browser write-origin checks use the actual addressed Host when the framework normalizes its internal URL to the configured authentication host. Foreign origins, malformed hosts, non-JSON posts and arbitrary forwarded-host aliases remain rejected.
- Next.js updated from 15.5.27 to the same-series security patch 15.5.28. The production audit identified the published [image-optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw) and [Server Actions advisory](https://github.com/advisories/GHSA-p3m5-59mp-jv5r); both list 15.5.28 as patched. This is a targeted dependency update, not a major framework migration.
- Additive migration `20261023090000_learning_resources`, applied after a private database snapshot. No reset or reseed was performed.
- Three **private English trainer-guide drafts**, covering accounts/privacy, contributions/review and offline learning. They are not published cultural lessons. Review content/permissions and use an independent reviewer before publication.

## Verification record

Execution evidence is under `docs/system-audit/`. Only checks actually completed should be treated as passed. Provider transport mocks do not establish real message delivery or native OS acceptance.

- Latest complete regression run before final browser/native checks: **127 tests passed**.
- Schema validated; additive migration applied successfully; private pre-migration snapshot created.
- Web production build: **passed**, including type checks; lint reports **29 image warnings, zero errors**. The existing Tailwind module-format warning is non-fatal.
- Mobile production bundle: **passed**. Android and iOS copies match all **20 generated bundle files**. The Android APK was opened as a ZIP and every packaged bundle file also matched the current build.
- Backend and mobile production dependency audits report **zero known production vulnerabilities** after the Next.js patch. Development tools are outside those production-only results.
- Android USB development build and lint: **passed**, **zero lint errors / 27 warnings**. APK: `clients/mobile/android/app/build/outputs/apk/debug/app-debug.apk`. This is an explicit loopback/USB development build, not a store release.
- Live API acceptance: **passed** actual author/reviewer/publication gates, grading, duplicate retries, account/saved-item separation, native legacy contribution handlers, private draft ownership and withdrawal. Actual credentials/CSRF sign-in issued a browser cookie for the same account; sign-out-all then rejected both that browser cookie and the native token. The corrected loopback origin path passed; a foreign origin was still rejected. Isolated synthetic records/accounts and their login counter were removed afterwards.
- Shared web browser acceptance: **passed** text download, real offline shell reload, restored local queue owner, an offline attempt, restart persistence and one reconnect synchronization. Contribution text, cached form definitions and actual File bytes also survived an offline restart; explicit device-copy deletion persisted. API responses were mocked for this browser test; the real server semantics were checked separately above.
- Existing browser entry and mobile preview checks: **passed** login/registration phone layouts, public library, desktop/mobile navigation, language/view controls, chat consent/failure/retry/source links and connection recovery. AI transport was intercepted; no real provider acceptance is claimed.
- Post-implementation inventory: **80 cultural records, 51 media assets, 2,708 transcripts, zero dictionary entries**, matching the pre-implementation content inventory; **three private trainer drafts** added; **zero synthetic acceptance accounts left**.
- Android device acceptance: **not performed**, because ADB reports no connected phone/emulator. iOS assets were synchronized, but iOS compilation/device acceptance remains unverified.
- Live API acceptance uses isolated synthetic accounts/resources and removes them afterwards. It must not publish existing research material.
- Browser offline acceptance uses real UI, service worker, IndexedDB and network/reload behavior, with API responses mocked and no provider/database writes.
- iOS cannot be compiled or certified from this Windows host. Matching JavaScript assets alone do not prove an iPhone build or OS behavior.

## Configuration

Set secrets on the backend, never in `VITE_*` values. Environment credentials take precedence over legacy saved provider values. The mobile public backend origin must be set when building its bundle.

| Service | Environment values | Additional setup |
|---|---|---|
| Database/authentication | `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`/`NEXTAUTH_URL` | Apply migrations to each deployment; use a reachable HTTPS backend outside explicit local USB development. |
| Public account email | `APP_PUBLIC_URL`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_API_KEY` | Verify the sender/domain. Providers supported: Resend and SendGrid. |
| Google | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Register the deployment callback `/api/auth/callback/google`. |
| Apple | `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET` | Register the service/domain/callback; supply the valid Apple client-secret JWT and renew it before expiry. |
| Microsoft Entra | `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | Register the tenant/application and callback `/api/auth/callback/microsoft-entra-id`. |
| SMS | `AT_USERNAME`, `AT_API_KEY`, optional `AT_SENDER_ID` | Africa's Talking account, appropriate sender/network approvals and credit; real delivery still needs testing. |
| Existing AI | `GEMINI_API_KEY` | Actual provider availability, billing and source/accuracy acceptance remain separate. |
| Existing media | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Configure the owned storage account and verify upload/delivery/backup. |
| Native backend | mobile `VITE_API_ORIGIN` | Public HTTPS origin of the current backend. It is not a secret. |
| Browser previews | `APP_PUBLIC_CLIENT_ORIGINS`, `APP_NATIVE_CLIENT_ORIGINS` | Explicit preview origins, for example `http://127.0.0.1:4173`; private cross-origin access uses bearer tokens, never browser-cookie CORS. |

Provider setup follows [Auth.js OAuth configuration](https://authjs.dev/guides/configuring-oauth-providers), [Microsoft Entra provider configuration](https://github.com/nextauthjs/next-auth/blob/main/docs/pages/getting-started/providers/microsoft-entra-id.mdx), and [Africa's Talking SMS setup](https://help.africastalking.com/en/articles/2258472-how-do-i-start-sending-messages). These references describe configuration, not evidence that this deployment's accounts are ready.

## Training preparation for Sunday, 25 October 2026

1. Use a deployment containing the current migration and source, or the local production build. Open **`/application`** for the common web/native experience.
2. Confirm named contributor, editor, cultural reviewer and publisher accounts have the correct language roles. Interests do not grant these roles. Reviewers must be independent of authors.
3. In the application, choose English and open **Lessons, games & calendar → Content workspace** to inspect the three private trainer guides. Correct them, confirm applicable permission, and use separate review/publishing accounts if they are to become public.
4. Use invented practice text and consent-cleared recordings. Do not expose the research-only interviews to fill empty public sections.
5. Rehearse browsing, saving, creating a draft, uploading, requesting corrections, translating, validating and publishing. Test failure and permission-denial cases as well as success.
6. Download an explicitly permitted lesson while online. Rehearse airplane mode, app restart, queued progress and reconnection before demonstrating it to trainees.
7. Treat unverified OAuth/email/SMS, native recording and iPhone behavior as pending acceptance until they have been exercised with the actual accounts/devices.

## Work still required for the complete scope

**Credentials are not the only remaining dependency, and this increment does not complete the full PRD/NRF scope.** The following software or acceptance work remains:

- Full game suite, rewards/leaderboards and multiplayer; current games are authored quizzes.
- Complete curriculum pathways, classroom/teacher workflows and richer speaking/listening/writing assessment. Current lessons support authored text/questions/instructions and persistent progress.
- Durable offline audio/video packs, local media search, file transfer recovery and complete native background/resumable upload handling. Current learning packs contain text; contribution drafts can preserve selected files, but uploads are chunked without a restart-persistent transfer manager.
- Native push registration/delivery/preferences and full delivery reporting; the notification inbox, email and linked-phone integrations do not implement APNs/FCM push.
- Evaluated speech recognition, pronunciation scoring, Dholuo TTS, machine translation/grammar/writing assistance, OCR, artifact recognition, knowledge relationships and model training/versioning. Existing grounded chat/summaries/entity extraction do not complete all these capabilities.
- Actual 3D/AR artifacts, story animation and virtual tours, with suitable approved assets and client functionality.
- Full researcher/custodian tooling, community/group/purpose/site policy, separate protected identity/protocol/decision models, immutable derivatives/releases, reproducible dataset/model lineage, retention and source-level withdrawal propagation. Educational resource withdrawal is not the formal repository-wide workflow.
- Complete parity for all administrative/system-management screens and every rich cultural journey, including authenticated private-media preview and all platform-specific edge cases.
- Complete interface localization with reviewed Dholuo/English wording; selecting cultural content language does not translate every new interface label.
- Institution SSO/MFA policy, on-premises storage/inference migration, scheduled incremental/full backup operations, witnessed restoration, load/performance/security/accessibility acceptance and support handover.
- Signed distribution builds, permanent identifiers, platform capabilities, real Android/iPhone testing, store accounts/listings and external review.
- Reviewed cultural inventory, translations, recordings, curriculum and permissions. Code cannot substitute for source rights or expert evaluation.

The work above remains part of the same full system. It is not deferred to a newly named phase or silently excluded from completion.

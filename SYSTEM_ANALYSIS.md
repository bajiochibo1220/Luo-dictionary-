# LuoLinguaAI system analysis

> Historical audit before repairs. Implemented fixes and current verification are documented in [REPAIR_REPORT.md](REPAIR_REPORT.md); findings below describe the original state, not the repaired state.

Review date: 11 October 2026. Scope: local source review, TypeScript checking, lint/build checks, and isolated route checks with mocked sessions and database records. This is not a live production penetration test. Application source and database records were not changed.

## What the system does

LuoLinguaAI preserves Dholuo language and Luo cultural knowledge. Its current implementation is a Next.js web application with public browsing, authenticated contributions, staff review, administrative management, and an AI assistant.

The public collections include dictionary entries, proverbs, riddles and quizzes, songs, folktales, oral histories, artifacts, and heritage sites. Public routes use language codes and culturally named paths such as `/luo/muma`, `/luo/ngero`, and `/luo/sigana`.

The database uses PostgreSQL through Prisma. CulturalRecord holds module-specific JSON content, publication state, source information, and access metadata. Separate tables hold translations, media, transcripts, provenance, consent evidence, review decisions, revisions, user roles, notifications, analytics, and AI conversations. Dictionary content currently exists in both DictionaryEntry and CulturalRecord; several routes combine them.

Authentication uses NextAuth with password credentials and Google. Ordinary profile interests are separate from staff authorization. Staff permissions are assigned per language: uploader, cultural expert, content editor, publisher, and language administrator. Super-admin and master-super-admin flags provide additional powers.

The main intended workflow is draft → submitted → cultural review → under_review → final publication or internal curation. Reviewers can request editing, which moves an item to needs_edit; the edited item is sent through cultural review again. The single-item approval endpoint prevents contributors from publishing their own work. English translation completeness is checked before cultural approval and publication.

Access governance combines consentScope, restrictionLevel, and embargoUntil. Public material must have public_excerpt consent, public restriction, and an eligible date, as well as published status for records. Source permission adds another publication check. Research-only/internal corpus imports deliberately stay outside public display and external AI processing.

Media uses Cloudinary authenticated storage, SHA-256 integrity checks, repository/session identifiers, and an application endpoint that authorizes and streams files. The README's reference to Cloudflare R2 does not match the current implementation.

The active AI code uses Gemini generation and embeddings with PostgreSQL vector retrieval. It searches approved sources, includes recent conversation context, returns citations and media, and saves signed-in conversations. This is retrieval over stored knowledge using an external model; this repository does not establish that a custom Luo model has been trained.

The Phase Two documents describe native Android/iPhone apps, offline learning and progress synchronization, push/email/SMS delivery, and speech-to-text work. These are planned deliverables. The current mobile offering is a browser-installable web application; planned features should not be counted as existing features or diagnosed as regressions.

## Verified findings, ordered by impact

### 1. High: any signed-in user can enumerate other accounts

`src/app/api/users/route.ts:7` checks authentication but never checks an administrative role. GET returns user IDs, emails, names, account status, and role information. `src/app/api/users/[id]/route.ts:6` similarly allows an ordinary account to read another account's details.

An isolated invocation of the real users GET handler with an ordinary session and a mocked database returned HTTP 200 with another user's email. Hiding the administration page does not protect these API calls.

Fix: require user-management permission, scope administrators to the languages they manage, and provide a separate tightly scoped self-profile endpoint.

### 2. High: draft media can pass anonymous authorization

`src/app/api/media/[id]/file/route.ts:32` first checks published parent status but then falls back to governance helpers. Those helpers return true for public consent/restriction fields without considering publication status. A draft parent and its media with public_excerpt/public metadata therefore pass the fallback with no session. The media metadata GET endpoint uses the same pattern.

A mocked invocation of the real file GET handler returned HTTP 302 for an anonymous request to a draft's legacy upload URL. The helper-level check also returned anonymousAccess=true while parentPublic=false. For authenticated-delivery assets, the same authorization branch precedes signing and streaming; provider delivery was not tested.

Fix: require publication for anonymous access on every branch, and allow the fallback only for an authenticated user with explicit private access.

### 3. High: dictionary endpoints bypass staged review

`src/app/api/dictionary/route.ts:182` derives publication permission from canReviewContent. A content editor or cultural expert can POST public-ready content directly as published, with themselves as contributor. It does not require a separate validator or publisher, and creates the default English translation only after setting published state.

The legacy DictionaryEntry PATCH endpoint, `src/app/api/dictionary/[id]/route.ts:81`, can also set published state directly from access metadata. Its DELETE handler does not prohibit deleting published entries. These rules differ from the main CulturalRecord workflow.

Fix: route both dictionary representations through the same review, translation, self-review, and deletion policies as other cultural content.

### 4. High: bulk publishing omits the self-publishing restriction

`src/app/api/content/[id]/approve/route.ts:35` rejects publication by the contributor. `src/app/api/content/bulk-publish/route.ts:33` checks publisher permissions but does not reject records contributed by the publishing user. Someone with publisher rights can use bulk publication to bypass the single-item rule after another reviewer validates the item.

Fix: enforce contributor separation in the common publication policy used by both endpoints.

### 5. High: approved content can acquire unreviewed public media

`src/lib/media-upload-auth.ts:20` does not select or check record status. The contributor or an authorized uploader can attach files while an item is under review or already published. `src/app/api/media/upload/finalize/route.ts` copies the parent's public access fields to newly attached media and leaves the record published.

This lets files become public without passing through the review that approved the original package. The media reassignment PATCH endpoint also attaches files to published content and copies its access settings.

Fix: limit upload stages or return changed packages to review, and make finalization recheck status inside the database transaction.

### 6. High: translation writes bypass record governance

The translation branch at `src/app/api/content/[id]/route.ts:75` runs before the governance check used by source edits. It allows source uploaders/editors or target-language editors to change a translation and returns the updated data without checking canReviewGovernedItem on the source record.

An actor with an ordinary uploader/editor role can therefore modify a translation of material whose sacred or community-only restrictions would prevent them from opening its normal edit page. Validate/approve actions also check workflow roles without consistently checking the item's governance restrictions.

The cultural validation detail page at src/app/(admin)/admin/validation-queue/[id]/page.tsx also authorizes by language role and loads the record, media, translations, and provenance without applying the governance helper. A language administrator can therefore see sacred/community-only material that the ordinary content API would deny.

Fix: apply record access checks before choosing either editing branch, rendering review details, or performing review mutations.

### 7. High: suspension does not invalidate ordinary access

`src/lib/auth.ts:135` removes privileged flags/roles for inactive users but keeps token.id and nonprivileged roles. `src/lib/permissions.ts:106` permits contributions whenever session.user exists. Existing suspended sessions can therefore still reach routes that require only authentication and can contribute as ordinary users.

The focused permission check returned suspendedSessionContribution=true. New suspended logins are blocked; this defect concerns already-issued sessions. The JWT refresh error handler also retains old claims when role reload fails, rather than denying privileged access.

Fix: invalidate inactive sessions and make active-account status part of server-side authorization.

### 8. Medium: contributors cannot read their own pending files

`src/app/api/media/[id]/file/route.ts:34` requires asset governance access before considering ownership of the parent. A public contributor with no staff roles cannot pass that check for pending/internal media, even when they own the record.

A mocked call to the real handler with an owner session returned HTTP 404. The content GET handler separately allows owners to see the attached media metadata, making the returned file link unusable.

Fix: explicitly allow appropriate owner access to their attached files, while retaining publication checks for anonymous readers.

### 9. High operational risk: anonymous AI requests have no application quota

Middleware explicitly exposes `/api/ai/chat`. The handler bounds question length but has no request-rate, concurrency, or spending control. No application rate limiter was found in the reviewed source. Anonymous responses are not persisted as AIResponse rows, so dashboard query counts do not include this traffic.

This creates a cost/availability exposure, not evidence that abuse has already occurred. External hosting controls were not inspected.

Fix: add anonymous and account quotas, provider spending safeguards, and usage telemetry that includes anonymous calls.

### 10. Medium: semantic search fails silently for anonymous users

The public search page is visible without authentication, but `/api/ai/search` requires a session. Middleware can redirect an anonymous API request to the HTML login page; `SemanticSearch` then attempts res.json() without handling that error. Even JSON error responses are ignored when success is false.


Fix: expose the intended sign-in requirement clearly, handle HTTP and JSON errors, and discard obsolete responses.

### 11. Medium: settings can save successfully without affecting runtime behavior

The system page saves cloudinary_cloud_name, cloudinary_api_key, and cloudinary_api_secret to SystemSetting. `src/lib/cloudinary.ts:5` and the signature endpoint read only process.env credentials. Changing those settings does not reconfigure uploads.

maintenance_mode is stored and displayed but no request handler or middleware enforcement was found. SMTP settings are saved, but no mail sender using them was found in source. These are disconnected controls, rather than verified external-service failures.

Fix: wire each control into the service that consumes it or make its planned/unavailable state clear.

### 12. High recovery risk: the backup is not a complete recoverable database backup

`scripts/backup-database.ts:37` exports selected tables. It omits content translations, review/version history, consent-to-asset links, system settings, conversations and AI responses, authentication accounts, and user fields including passwordHash, isMasterSuperAdmin, dateOfBirth, and profileTypes. It stores media metadata, not the Cloudinary files themselves.

The export is written to a local path and no restoration workflow was found. Its reads are not a consistent database snapshot. It may be useful as a partial content export, but should not be treated as full disaster recovery.

Fix: add a consistent database backup, durable storage, media recovery coverage, and a tested restoration procedure.

### 13. Medium: dashboard analytics and health indicators are inaccurate

`src/app/api/analytics/route.ts:35` selects only createdAt and eventType, but geographic analysis later reads metadata.country from those rows. Geographic results will therefore be empty even if events contain country metadata.

Unique visitors count only non-null user IDs, excluding anonymous visitors. The analytics API also checks only authentication, exposing aggregate searches and activity without a staff authorization check.

`src/app/api/ai/monitoring/route.ts` divides embedding rows by record count. Multiple translation embeddings per record can produce coverage above 100%, which does not measure how many records are indexed.

The super-admin dashboard also checks OPENAI_API_KEY for AI health while the active AI implementation uses Gemini, treats the presence of a Cloudinary cloud name as storage health, and hardcodes backup health to warning. These labels do not establish service availability or recovery readiness.

Fix: select the data actually used, define visitor counting accurately, enforce analytics permissions, calculate coverage from distinct indexed record IDs, and use meaningful checks for the active services.

### 14. Medium: AI reindexing can remove a working index before replacements exist

`src/lib/ai/embeddings.ts:68` deletes existing vectors before calling the provider and inserting replacements. A provider failure leaves missing or partial indexing. Similar logic appears for dictionary and transcript embeddings.

The RAG retriever always takes its highest-ranked results without a minimum relevance threshold. Unrelated questions can still receive weak source matches whenever the index has rows; source presence is not evidence of relevance.

Record embedding also reads all media captions/alt text without filtering media governance, even though public record approval does not itself prove every legacy attachment is independently public.

Fix: prepare replacement vectors before an atomic swap, filter independently governed media, and add relevance evaluation with a low-confidence fallback.

### 15. Medium: automated verification is incomplete

TypeScript checking passed with `npx tsc --noEmit --incremental false`.

`npm run lint -- --no-cache` exited at the interactive ESLint setup question; linting is not configured for unattended checks. package.json has no automated test script, and no dedicated test/spec files were found outside dependencies and generated/browser-profile folders.

The first production build was blocked by sandbox process spawning (`spawn EPERM`), which was an environment limitation. The retry outside the sandbox completed successfully with exit code 0, compiled the application, checked types, generated 72 static-page entries, and produced the route/build report. Some GET handlers logged dynamic-server-usage diagnostics during static probing; the final report correctly classified those API routes as dynamic. A successful build does not establish that the authorization and service workflows are correct.

## Verification performed

- Reviewed application structure, schema, auth/middleware, role and governance helpers, public modules, contribution/edit/review routes, bulk actions, uploads and media delivery, users, settings, analytics, AI retrieval/indexing, backups, and Phase Two documentation.
- Passed TypeScript checking.
- Confirmed lint setup is incomplete.
- Passed the production build after an outside-sandbox retry; exit code 0.
- Invoked actual transpiled route handlers with mocked sessions/database records. Anonymous draft file access returned 302; ordinary owner pending-file access returned 404; ordinary-user account enumeration returned 200 with another user's email.
- Checked the permission helper for an existing suspended session; contribution remained permitted.
- Did not invoke paid AI services, upload or delete media, change database content, or test live production accounts.

## Recommended repair order

1. Close account-data exposure, anonymous draft-media access, governance bypasses, and suspension gaps.
2. Unify dictionary, single-item, and bulk publication policies; protect reviewed packages from later uploads.
3. Restore contributor file access and make search failures visible.
4. Implement AI quotas and complete backup/restore coverage.
5. Connect operational settings, repair analytics, and make indexing resilient.
6. Configure unattended linting and add regression checks for the demonstrated authorization and review failures before expanding Phase Two.

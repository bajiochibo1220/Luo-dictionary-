# LuoLinguaAI repair report

Repair date: 11 October 2026. This report supersedes the findings in the original read-only `SYSTEM_ANALYSIS.md`. It describes implemented repairs and distinguishes automated verification from provider and recovery acceptance checks.

## System understanding

The application preserves Dholuo language and cultural knowledge through public collections, authenticated contributions, language-scoped review, English translation, publication and restricted research curation. PostgreSQL/Prisma stores structured cultural records, legacy dictionary entries, media metadata, consent/provenance, review history, translations, users and conversations. Gemini provides retrieval grounded AI; Cloudinary stores authenticated original media. Public profile interests do not grant staff permissions. Native mobile/offline/speech deliverables in the Phase Two documents remain future work.

## Administrator and public navigation

The reported loop came from linking “View public site” to `/`, whose role redirect sent administrators back into administration, together with middleware preventing staff from using `/dashboard`.

- “View public site” now opens `/dashboard`, the public module interface shown in the second screenshot, while retaining the same signed-in account.
- All five language staff roles can use public browsing and return to their administrator dashboard.
- Super administrators and the master administrator can also switch to the super administrator dashboard. Ordinary administrators do not gain super administrator privileges by switching views.
- English public module browsing includes translated published records from other languages instead of appearing empty when the account has English staff roles. Sidebar module links now work when coming from profile or contribution pages. OAuth completion uses a server-verified landing route. Suspended accounts with stale cookies can reach login without a redirect loop.

## Repairs implemented

| Area | Previous problem | Result |
| --- | --- | --- |
| Users | Ordinary accounts could enumerate or read other users | Explicit management permission, language scoping and protected self-profile access |
| Authentication | Stale JWT privileges survived suspension or account changes | Database refresh replaces roles and denies suspended, deleted or unverifiable accounts; Google profiles retain stable provider identifiers |
| Media privacy | Anonymous draft access; owners could not preview pending files | Published parent and public consent required for visitors; explicit owner/staff access for private packages |
| Media review integrity | Files could be attached, moved or deleted after review began | Shared editable-stage policy, row locks and current-state checks; signed uploads cannot overwrite reviewed objects |
| Media responses | BigInt JSON failures and unsafe inline raw documents | Serializable metadata, permission responses without caching and attachment delivery for active document types |
| Publishing | Legacy dictionary and bulk paths bypassed review or contributor separation | Draft/review workflow, translation completeness and self-publication guards; legacy edits migrate into reviewed cultural records |
| Editing | Translation writes bypassed governance and raced publication | Governed access, workflow locks and conflict responses; contributor edit routes and retryable draft-first media submission |
| AI | Unbounded anonymous requests, silent public search errors and destructive reindex failures | Persistent quotas, public search, useful errors/cancellation and atomic index replacement after successful embedding generation |
| Settings | Saved provider values did not control runtime; incorrect settings timestamp SQL | Prisma batch updates and saved Gemini/Cloudinary configuration consumed by runtime; maintenance enforced |
| Operations | Incomplete database exports and no recovery command | Consistent complete snapshots, checksums, empty-target recovery, paired media backup/restoration and private storage defaults |
| Health/analytics | Wrong AI provider, hardcoded backup warning and misleading visitor totals | Actual Gemini configuration, backup age/file checks, bounded eligible index coverage and accurate activity labels |
| Email | Configuration interface had no test delivery implementation | Resend/SendGrid adapter and rate-limited administrator test to their own address; tests mock delivery |
| Settings form | Inline component definition could reset inputs during typing | Field component moved outside render so its identity remains stable |
| Dependencies | Known critical and other security advisories | Patched Next/Auth.js/Cloudinary and tooling dependencies; final online audit reports zero known vulnerabilities |

Next.js is now 15.5.27, with asynchronous route parameters/cookies and client wrappers for browser-only maps. Tailwind is now 4.3.3; utility names and the existing amber/stone theme were migrated. React remains 18. Lint runs explicitly before production compilation because Next 15's internal wrapper is incompatible with the flat lint configuration. The compatible patched lint configuration uses ESLint 8, which is upstream deprecated; replacing it with a supported newer configuration should wait for a patched dependency chain.

## Verification

- 37 isolated regression tests pass: real TypeScript modules with mocked accounts/database/providers, covering first-load redirects, navigation, authorization, private/public media, suspended sessions, publishing separation, review locks, index atomicity, quotas, maintenance, settings and snapshot validation. The latest cases also check direct contribution links, unavailable-form controls, media-library privacy, role-specific account menus, grouped dashboard totals and the React 18 cache fallback.
- Standalone lint passes with 28 existing image optimization warnings. Authenticated media often requires browser session cookies; replacing every image with the server image optimizer would require separate access design.
- Prisma client generation passes on Prisma 6.19.3.
- Online npm audit: zero known vulnerabilities, including development dependencies, at the time of verification.
- Read-only live database conversion checks pass for all 34 public tables. No snapshot contents or account credentials were printed.
- Production build and final standalone TypeScript check pass. The additive operational-table migration was applied successfully.
- Chrome navigation passed for master, super administrator, language administrator, uploader, publisher, content editor and cultural expert accounts. Master switching passed public -> admin -> super-admin. Desktop/mobile dashboard CSS and overflow checks passed.
- Final browser checks also passed for all eight public module dashboards and settings input focus after typing, without saving settings.
- Before the entry-screen update below, the runtime sweep covered 23 signed-in pages and 17 anonymous public pages returning HTTP 200; ordinary users received 403 for the user directory and anonymous protected API requests received JSON 401. Bare language landing pages now redirect instead of returning the retired landing page.
- A real complete private database snapshot was created and excluded from Git. Restore dry-run validation passed for all 33 application tables (migration history is retained separately). No restoration was applied.
- Read-only provider checks passed: Gemini model-list authentication HTTP 200, embedding model available, and Cloudinary authenticated storage connection. No generation, email or uploads were performed.

## Initial login screen update

The root route previously opened the obsolete white language landing page. New visitors opening `/` now see the existing brown/gold login interface. The old landing page JSX was removed; legacy `/luo` and `/eng` launch URLs redirect before rendering its public layout. Signed-in users open the current public dashboard, with the administrator view switches preserved. Nested public library routes remain available.

Login and registration continue to share the existing authentication design. Tailwind scanning is explicitly limited to application source, avoiding unrelated corpus files and browser profiles in the workspace. Added regression cases verify both entry pages for anonymous, invalid, ordinary signed-in and master administrator sessions.

An isolated Chrome check against the running local app passed for `/`, `/luo` and `/eng`: each opened the current login screen without the old landing content. Clicking Create new account opened the matching registration screen. The rendered login and registration designs were also visually inspected.

## Contribution controls and loading performance

Both the module header's Contribute link and the empty module's Add the first entry link now open the corresponding structured contribution page directly. The contribution hub excludes unfinished placeholder modules, and their form URLs are rejected. The structured editor uses a real form with keyboard submission, required-title validation and a guard against duplicate saves. Login and registration Help and Privacy links open existing information pages.

Folktales, Cultural Artifacts and Heritage Sites were active but had no seeded field definitions, leaving their contribution pages unusable. An additive migration supplies 13 missing definitions using the data keys already read by their public detail pages. Existing definitions, translations, records and accounts are preserved. The seed script now supplies the same fields for new installations; no existing database was reseeded.

The contribution hub only offers modules with actual field definitions. Module browsing suppresses contribution controls when no form is configured. The AI Chatbot sidebar opens the working `/chatbot` interface, including redirects from its old module bookmark. The Audio-Visual Library displays eligible published media across modules while enforcing the same record, media, consent and language restrictions.

Account menus and sidebars retain real links and display a pending indicator during navigation. Public and administrator route groups also show a loading state while their server content is prepared. Switching modules resets filters to prevent a filter from the previous module hiding its contents.

Physical browser testing also exposed a validation notification covering the account button. Notifications now appear at the bottom center and have a close button, keeping the header and account-menu controls accessible even during notification animations.

Authentication and shared public navigation reads use request-scoped caching during server rendering; ordinary React 18 tools fall back to fresh reads. Current database roles and suspension checks remain enforced. Public upload statistics use one grouped query. Administrator and super administrator statistics use grouped counts and parallel independent queries instead of two queries for every module or language.

The existing Inter and Lora fonts are bundled with their open-source licenses, removing Google font downloads during builds and page visits. Production and development have separate build directories. For regular use, `npm run build` followed by `npm start` serves precompiled pages on port 3000; `npm run dev` remains available for editing. In development, measured cold Proverb page loads took approximately 80 to 239 seconds, and a cold anonymous login took about 30 seconds. Those development numbers include compilation and are not production performance claims.

Read-only live checks confirm all eight core contribution URLs render their structured forms with title, private-draft and submission controls. The contribution hub excludes the chatbot and media-library tool URLs. Blank Proverb submission shows required-title validation without creating a record. Final physical mouse checks passed for Contribute, My dashboard, Admin dashboard, Super Admin dashboard, return to public browsing and the Dictionary sidebar link immediately after validation. Both bundled fonts loaded, and no uncaught browser exceptions occurred.

The final production build is running on `http://localhost:3000`; the workspace's development server was replaced after verifying the production build. A final Chrome sweep on port 3000 passed all available staff account types, desktop/mobile overflow, 23 signed-in pages, 16 anonymous pages, all three entry URLs and registration navigation. Ordinary user-directory access returned 403 and anonymous protected API access returned JSON 401. The warmed Proverb browser page opened in 2.50 seconds; physical route changes ranged from 1.28 to 4.15 seconds in that run.

Final complete HTML response timings on port 3000, after browser verification:

| Page | First measured request | Repeat request |
| --- | ---: | ---: |
| Login | 324 ms | 63 ms |
| Public overview | 2,249 ms | 1,447 ms |
| Proverbs | 1,917 ms | 1,734 ms |
| Proverb contribution | 2,495 ms | 3,036 ms |
| Administrator dashboard | 3,162 ms | 2,810 ms |
| Super administrator dashboard | 1,713 ms | 1,929 ms |

These are local production measurements with the existing remote database, not guarantees for every device or network. HTML response timings exclude asset download and browser hydration. Refresh an already-open browser once to load the new build. For future everyday launches, use `npm start`; rebuild and restart after source changes.

## Practical limits and operational follow-up

Automated checks do not establish that every real external-service flow works. Google OAuth, Gemini generation and full signed Cloudinary uploads, real email delivery, and an isolated full database/media disaster-recovery rehearsal need provider acceptance testing. No content was published, accounts altered or existing database reset during these repairs. One live browser attempt hit a temporary database connection failure; retries completed successfully. Hosting/database connectivity remains an operational dependency. Test delivery does not implement account recovery/verification, SMS or native push.

Apple, Microsoft and phone sign-in buttons currently announce that those providers are coming soon; their authentication flows are not implemented. They require provider setup and implementation rather than a navigation fix. This repair does not claim those providers are working.

Database snapshots contain secrets and must remain private. New snapshots/media folders are ignored by Git. Two old snapshot JSON files are already tracked; an ignore rule does not remove their historical copies. Before sharing the repository, review those historical files and remove sensitive history/rotate credentials if it was exposed. This repair did not rewrite Git history.

Tailwind 4 requires modern browsers. This repair validates local production execution; external hosting configuration, older browser support, provider budgets and network reliability are separate deployment concerns. Build tooling can emit a harmless module-format warning for the TypeScript Tailwind configuration and Auth.js compression imports in the default Edge middleware bundle; the browser checks exercise the actual session path.

See `RECOVERY.md` for the new recovery procedure. Restart an existing development server after the dependency upgrade so it runs the updated code.

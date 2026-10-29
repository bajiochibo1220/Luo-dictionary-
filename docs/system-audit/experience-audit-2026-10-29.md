# Usability, navigation and AI audit — 29 October 2026

These changes are in the local workspace. They have not been deployed.

## Findings and fixes

| Finding | Change |
| --- | --- |
| Research and staff tabs extended beyond narrow screens. | Put scrolling tabs in their own positioning context. Hidden absolute labels had escaped the scroll container. Labels are now visible on phones, with horizontal scrolling inside the tab bar. Search fields can shrink and workflow selectors fit the available width. |
| A supplied navigation cancellation signal disabled request timeouts. | Shared web, chat, bootstrap and mobile transports now combine cancellation with a deadline. Ordinary requests retain bounded waits; AI generation retains its longer deadline. A fallback covers browsers without `AbortSignal.any`. |
| AI screens could submit duplicate requests or retain results belonging to another source. | Added synchronous submission guards, source/loading states, fresh consent when changing source or practice mode, and generation checks that discard responses from a previous language or account. Provider failures release the guard so retry works. |
| Guests reached personal screens and encountered confusing failures. | Personal screens and AI tools now offer a direct sign-in action. Public discovery remains available without an account. Web sign-in remembers the current application screen. Server authorization remains in place. |
| AI citations using module codes such as `oral_histories` had no usable link. | Source navigation normalizes underscores, hyphens and spaces. Tutor references are links as well. |
| Some collections displayed an empty-state message before loading completed. | Added explicit loading states to places, saved items, staff uploads and AI sources. Places and knowledge connections have retry actions. Saved-item removal prevents duplicate requests; settings refresh clears stale errors. |
| “Courses & classrooms” and teacher instructions promised classroom controls absent from the current interface. | Navigation and help now describe the available learning pathways. Legacy classroom links lead to courses. This audit does not add classroom management. |
| The installation button could obscure content and could not be dismissed. | It waits 20 seconds after the browser offers installation, sits above the floating chat control, has an accessible dismiss action remembered for the browsing session, and safely handles rejected or consumed browser installation events. |

The earlier [content organization work](content-organization-2026-10-29.md) and [public discovery changes](public-discovery-2026-10-29.md) remain included: grouped content areas, consistent statuses and actions, authorized individual/bulk deletion, and public content visible before optional registration.

## Verification evidence

| Final check | Result |
| --- | --- |
| Automated regression suite | 381 passed, 0 failed |
| Production web build | Passed, including type validation and route generation |
| Production mobile build | Passed |
| Lint | 0 errors; 8 existing image-optimization warnings |
| Browser screen/width combinations | 140 checked; 0 page overflows; 0 runtime exceptions |
| Browser navigation and AI interactions | Passed, including source links, guest actions and installation-prompt dismissal |
| Anonymous public/private server routes | 29 passed |
| Actual database and configured AI services | Passed; grounded chat returned 5 citations |

Screenshots: [mobile discovery](experience-dashboard-390.png), [desktop discovery](experience-dashboard-1440.png), [mobile staff workspace](experience-workspace-390.png), [desktop staff workspace](experience-workspace-1440.png), [mobile tutor](experience-tutor-390.png), [mobile AI tools](experience-ai-tools-390.png).

The structured results and logs in this directory distinguish actual service checks from simulated browser data:

- `experience-tests-2026-10-29.log`: full automated regression suite, including authorization, governance, deletion, authentication, AI quotas, provider failures and the new reliability cases.
- `experience-build-2026-10-29.log`: production web compilation, type validation and route generation.
- `experience-mobile-build-2026-10-29.log`: mobile TypeScript validation and production bundling.
- `experience-lint-2026-10-29.log`: lint results.
- `experience-browser-2026-10-29.json`: production-bundle browser checks, 19 main screens plus 9 additional staff sections at 320, 390, 768, 1024 and 1440 pixels. Every API request is intercepted with synthetic data. It also checks mobile menu controls, AI image-draft submission, tutor submission, cultural chat, source navigation and guest sign-in actions.
- `experience-routes-2026-10-29.json`: anonymous GET checks against the local production server, including public collection routes and login redirects for private screens. Next.js can send a redirect inside an already-started response; the check recognizes that streamed redirect too.
- `experience-live-services-2026-10-29.json`: actual read-only public catalog, configured text AI, cultural-chat greeting, tutor translation and synthetic-image understanding checks.
- `experience-grounded-ai-2026-10-29.json`: actual cultural retrieval and answer generation, returning five public-source citations.
- `experience-connectivity-2026-10-29.json`: database connection diagnostics. An initial pooled connection failed with `P1017`; subsequent pooled/direct diagnostics and actual service checks succeeded. No database connection configuration was changed.

Live provider requests used synthetic prompts or currently public material. The scripts refuse model writes and disable analytics writes. No real account, content, review, publishing or deletion operation was submitted during the browser audit. Screenshots contain synthetic audit data.

## AI availability and practical limits

The configured service returned text, tutor feedback, grounded cultural answers and image descriptions. These checks establish successful requests and citations, not independent linguistic or cultural accuracy. Existing fluent-speaker/cultural review guidance remains visible. Image understanding uses the provider's documented [vision request format](https://api-docs.deepseek.com/guides/vision/).

Audio transcription and image generation are currently disabled in the service capabilities and are labelled unavailable. They were not enabled or claimed as working.

Browser tests use Chrome viewport emulation; they are not physical Android/iOS or Safari testing. Real destructive workflows and email delivery were not exercised against live accounts. Their automated regression coverage is separate from the read-only live checks. The mobile bundle still has a size warning; further splitting could improve downloads on slow connections. Existing image-optimization lint warnings remain.

These results describe the tested local build and current service responses. They do not guarantee future provider availability or replace a deployment smoke test.

## Repeat the checks

From the repository root, the regression suite can run with `node --test --experimental-test-isolation=none tests/*.test.cjs`; lint with `npm run lint`; and the mobile build with `npm --prefix clients/mobile run build`.

For the web production audit, set `NEXT_DIST_DIR=.next-organization`, build with `node node_modules/next/dist/bin/next build`, then start that build on port 3017. Run `node scripts/audit-experience-browser.cjs` and `node scripts/audit-experience-routes.cjs` against it. `SMOKE_BASE_URL` can select another local test origin. The browser script requires Chrome at its documented Windows installation path.

The optional live service checks are `node scripts/audit-experience-services.cjs` and `node scripts/audit-experience-services.cjs --retrieval-only`. They contact the configured database and AI provider, so their timing and availability vary.

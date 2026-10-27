# Dashboard, authentication and manual redesign — 27 October 2026

The shared browser/mobile application, public dashboard, teaching/research shortcuts, administration shell and metrics, discovery page, authentication layout and account manuals now use a consistent teal, cream and warm-gold palette. Reusable Lucide icons replace letter/emoji navigation markers. Important actions retain labels; password visibility uses labelled icon buttons. Layout fixes cover narrow quick-action rows, tablet shortcut grids and date-of-birth controls.

The public dashboard uses feature cards and a manual shortcut. Assigned teachers and researchers see relevant entry cards. Administrator metrics continue to use actual server queries; no production statistics were invented. Master-only backup links are filtered out of ordinary administrator quick actions. Institutional background/logo configuration remains available.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full automated regression | **251 passed, 0 failed**, exit 0 | [Log](design-regression.log) |
| Real browser components | **36 journeys** at 320, 390, 768 and 1440 px; no page/control overflow in tested screens | [Results](design-browser.json), [harness](verify-design-ui.cjs) |
| Web production build | Passed, exit 0; compilation, type validation, all 53 static pages and packaging | [Log](design-production-build.log) |
| Packaged Android/iOS interface | TypeScript/Vite passed, exit 0 | [Log](design-packaged-build.log) |
| Real registration and password authentication | Passed against a temporary local production server and the configured database | [Results](design-auth-http.json), [harness](verify-design-auth-http.cjs) |
| ESLint | 0 errors, 39 warnings | Included in the production build log. |
| Whitespace | `git diff --check` passed | Ordinary CRLF normalization notices remain. |

The real authentication check created one uniquely named adult test account with a reserved `example.invalid` email, verified consent, hashed-password storage, absence of privileged assignments, rejection of the wrong password, a real credentials session, the correct public dashboard, the own-account API and sign-out. It removed the account, consent and rate counters afterward and confirmed the account/consent were absent. No existing account was changed and no email was sent. Anonymous Auth.js sessions can be `null`; the harness handles this response explicitly.

Registration now rejects foreign-origin requests, malformed/oversized input, inactive or English-only community selections, missing consent and invalid dates. Duplicate-email races produce a usable conflict. The form reports failed language loading with a retry button, waits for available communities and prevents repeated submission while signing in. Login waits for a successful authentication result before navigation. Native callback and assigned-role routing remain covered by regression tests.

## Screenshots

| Screen | Phone | Desktop |
| --- | --- | --- |
| Public dashboard | [390 px](design-home-390.png) | [1440 px](design-home-1440.png) |
| Login | [390 px](design-login-390.png) | [1440 px](design-login-1440.png) |
| Registration | [390 px](design-register-390.png) | [1440 px](design-register-1440.png) |
| Administration | [390 px](design-admin-390.png) | [1440 px](design-admin-1440.png) |

Screenshot/browser checks use isolated fixture transport and illustrative test metrics. Their forms do not create production accounts. The separate HTTP authentication check above exercises real account creation/login and cleanup. Browser checks include navigation, password visibility, invalid-login feedback, duplicate-registration handling, and public/editor/teacher/researcher manual selection. Existing regression checks cover the other assigned staff and super/Master manuals, download rendering, help routing and privilege boundaries.

## Manuals and limits

**My manual** on the dashboard and **Help & training** in navigation open the current account guide. Public users receive public learning/library instructions; assigned uploaders, editors, publishers, language administrators, teachers, researchers, elders and super/Master administrators receive their applicable guides. Multi-role accounts can switch between their assigned guides. Manuals remain searchable and downloadable. Teacher instructions now include courses, classroom invitations, assignments, gradebooks and archiving.

New wording is registered in the existing translation editor; blank local translations use English pending fluent review. This release does not claim completed audience-specific institutional workflows, all PRD content holdings, native signing/store/device acceptance, comprehensive assistive-technology acceptance, or external-provider availability. Live Google consent/login and email delivery were not exercised; existing callback/recovery tests do not substitute for those provider checks. Build image/hook, module-format and packaged-bundle warnings remain recorded.

No database migration was deployed for this redesign. The unfinished audience-plan scaffold from the interrupted task was removed before validation; it is not advertised as a completed workflow.

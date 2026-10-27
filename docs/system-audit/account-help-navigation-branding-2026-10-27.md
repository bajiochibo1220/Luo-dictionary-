# Account Help, navigation and background branding — 27 October 2026

The owner requested a manual for each account's assigned duties, correct dashboard/navigation destinations, a simpler interface and removal of the NRF logo. This request supersedes the earlier paired-logo presentation.

## What changed

- **Help & training** is available in public/staff navigation and web account menus. Public accounts receive the public-library manual; uploader, editor, publisher, language administrator, teacher and researcher assignments receive their own guides. Master and ordinary Super Admin guidance distinguishes their actual capabilities. Multiple assigned duties produce selectable guides; profile interests and URL parameters do not grant additional guides or privileges.
- Manuals contain short task instructions, search and a download of the selected guide. Guide wording is registered in the existing community/English text editor. Search includes translated wording, and downloads use available translations. Missing fluent translations retain the normal English fallback.
- Web Help lives at `/help`, `/admin/help` and `/super-admin/help`. Packaged Help stays at `#/help`, and its staff quick action stays in `#/workspace`. Public library, settings and retired-route aliases have explicit mappings. Unknown packaged destinations show an unavailable-page message instead of silently displaying an unrelated dashboard.
- Ordinary Super Admin navigation no longer advertises the Master-only Backup page. Master-only role flags are also recognized by the administrator language/culture selection endpoints.
- Only the uploaded **JOOUST** logo is rendered as an institutional background. Foreground partner strips and NRF branding captions have been removed. The public branding endpoint returns only JOOUST presentation fields; NRF logo uploads are rejected. Historical NRF repository identifiers and research metadata retain their technical meaning.
- Background images preserve their proportions, have no blur, are bounded by the source image size and do not intercept clicks. Public/admin/packaged backgrounds sit outside the content scroll layer; authentication backgrounds sit within the form surface. System > General > **Background & appearance** manages the JOOUST image and colour.

## Verification

| Check | Result |
| --- | --- |
| Full automated regression | 238 passed, 0 failed |
| Focused role Help, branding and navigation tests | 25 passed |
| Hydrated role-specific Help / branding UI | 42 journeys passed at 320, 390 and 1440 px |
| Credentials, Google and native-session routing | 17 journeys passed with isolated account fixtures |
| Packaged TypeScript/Vite build | Passed; bundle-size warnings remain |
| ESLint | 0 errors; 38 warnings remain |
| Final production build | Passed, exit 0, including type validation, page generation and build traces |
| Whitespace validation | `git diff --check` passed |

The 42 UI checks include public-only guide downloads, switching between assigned guides, clear uploaded JOOUST authentication backgrounds, usable form inputs, no horizontal overflow, stable packaged backgrounds during scrolling, workspace quick actions, tapping Chat and returning through the navigation drawer's Help link. Browser authentication/content use isolated fixtures; no production account or cultural content was changed.

Evidence: [browser results](account-help-browser-verification-2026-10-27.json), [UI harness](verify-account-help.cjs), [regression log](account-help-regression-2026-10-27.log), [production build](account-help-production-build-2026-10-27.log), [packaged build](account-help-packaged-build-2026-10-27.log) and [routing log](account-help-login-routing-2026-10-27.log). Screenshots: [registration at 390 px](screenshots/jooust-background-register-390.png), [login at 390 px](screenshots/jooust-background-login-390.png).

These changes do not claim universal system acceptance. The previously recorded live AI provider quota limitation, missing fluent translations, approved content requirements and native device/store acceptance work remain separate from these verified journeys. No application deployment or store release was performed in this pass.

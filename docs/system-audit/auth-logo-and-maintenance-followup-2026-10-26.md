# Authentication logo, maintenance and navigation follow-up — 26 October 2026

The JOOUST crest now sits behind login and registration form text as a contained watermark. It retains the uploaded image's aspect ratio, has no blur filter, and cannot exceed its original width or 320px. The current uploaded JPEG is 212 × 173px; stretching it to fill the viewport was making it soft. Light input surfaces keep typed text readable. Both uploaded partner marks remain together above the form fields.

Maintenance had two independent usability problems. The desktop switch changed draft state without saving, while its status text implied that the public site was already open. Server instances could also retain a previous setting in their separate one-minute caches. A read-only inspection during this task confirmed that the saved mode was still `on`.

The desktop switch now persists its change immediately, disables itself while saving, and changes its displayed state only after success. Failed requests retain the last saved state. The message retains its separate save action. The shared mobile workspace uses an on/off selector instead of free text. The API rejects invalid mode values and preserves administrator authorization and audit logging.

Maintenance checks and administrator settings reads bypass the general settings cache. Public language layouts are explicitly dynamic so a maintenance result cannot be frozen at build time. Open maintenance notices retry every 30 seconds while visible, when the window regains focus, and through a Try again button.

This change does not alter live database settings or account records. After deploying, turn the maintenance switch off; the updated switch saves immediately.

Dashboard navigation now uses the same destination policy as sign-in: public readers open `/dashboard`, assigned staff open `/admin/dashboard`, and Master/Super Admins open `/super-admin/dashboard`. The admin brand link and sidebar dashboard follow that policy, including accounts with only the Master flag. Explicit public-site links remain available. Duplicate dashboard menu links were removed and profile options are reached through Settings. The web public sidebar's staff link delegates to fresh server-side role routing.

The older language-library header now preserves the community when switching to English and when following English module links. Switching back retains the same record and search parameters. English without a valid community leads to the public application instead of guessing another community. The header also recognizes Master-only administrator flags.

Verification:

- 216 automated tests passed, including cross-instance cached-state recovery, public account access while off, invalid input rejection, authorization, audited settings changes, role-specific dashboard links, Master-only sidebar access, paired community-language navigation, and existing-page checks for static layout links. See [test output](auth-maintenance-tests-2026-10-26.log) and [navigation regression tests](../../tests/navigation-routing.test.cjs).
- Hydrated real login and registration components passed at 320, 360, 390, 768, and 1440px widths with the actual uploaded logos. Checks cover an uncropped crest within the initial viewport, no upscaling or blur, no horizontal overflow, and usable fields.
- Hydrated maintenance controls passed pending-save, successful-save, and failed-save checks. Maintenance notices passed interval, focus and manual retry checks. These use isolated settings responses and never write live settings. See [browser output](auth-logo-layout-browser-2026-10-26.log), [measurements](auth-logo-layout-verification-2026-10-26.json), and [verification script](verify-auth-logo-layout.cjs).
- Screenshots: [phone registration](screenshots/auth-logo-register-360.png), [desktop login](screenshots/auth-logo-login-1440.png).
- Mobile production build passed. See [mobile build output](auth-maintenance-mobile-build-2026-10-26.log). Lint passed with the existing 34 warnings and no errors.
- Web production build passed, including TypeScript validation and page generation. See [web build output](auth-maintenance-build-2026-10-26.log).
- All 17 hydrated sign-in flows passed again after the navigation changes: credentials and Google for Master, Super Admin, each assigned staff role and public readers, plus native handoff. See [sign-in browser output](navigation-login-browser-2026-10-26.log). Sessions and credentials were isolated fixtures.

The three new labels (Community language, Off, On) are included in the paired interface-copy catalog for editors. Their Dholuo translations remain blank pending fluent review; they use the existing English fallback.

These checks validate the changes above; they do not establish full PRD or NRF acceptance.

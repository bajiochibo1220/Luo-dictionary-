# Dashboard, bilingual display and password reset review

Date: 27 October 2026 (Africa/Nairobi).

## Changes

- The login page opens `/forgot-password`. Its only task is password reset: request an emailed six-digit code, enter that code, and enter and confirm a new password. Sign-in appears after successful completion. Existing `/account-recovery` bookmarks also open this flow when no separate action or legacy token is supplied.
- Verification and account deletion have individual links in account settings. Their existing email-confirmation links remain supported. The recovery action dropdown has been removed.
- Reset codes expire after 10 minutes. Only email-bound SHA-256 digests are stored. Requests are limited to five per 15 minutes and checks to ten per 15 minutes per email. A new code replaces earlier codes. Completion atomically consumes the code, updates the password, increments the session version and revokes existing browser/native grants. Failed email delivery removes the newly created code.
- New visitors start in Dholuo interface mode. Saved language preferences remain respected. Translated labels show a smaller, noneditable English line below. The English-only interface remains selectable. Assigned editors and language administrators retain the existing audited local/English editor; institutional role restrictions remain enforced.
- Library feed entries and detail dialogs show available English titles and descriptions below the original text. Grid cards show available English titles below the original title. Missing English descriptions are identified explicitly.
- The admin content area has a consistent maximum width and explicit flex scroll sizing. Quick-action labels now use the shared translation mechanism.

## Verification

- 257 automated tests passed, including new reset API validation, email normalization, purpose injection rejection, same-origin enforcement, hashed storage, failed-delivery cleanup, expiry, attempt limits, single use, session revocation, reset-only forms and paired interface rendering. See `dashboard-password-reset-tests-2026-10-27.log`.
- TypeScript passed. ESLint passed with 39 existing warnings (mainly image optimization and effect cleanup references).
- Final `npm run build` passed, including compilation, type checking, all 55 static pages and build tracing. See `dashboard-password-reset-build-2026-10-27.log`.
- The final interface/editor/navigation regression run passed 30 tests, including whitespace around bilingual fragments.
- Read-only browser checks passed sidebar collapse/expansion, persisted desktop preferences, keyboard resizing, phone drawers, focus trapping and Escape/focus restoration on public and admin workspaces. Fully loaded public, admin and super-admin dashboards passed Dholuo/English rendering and viewport checks at 1,365px, 390px and 320px.
- Headless Chrome passed login/registration callback preservation, rejection of external callback destinations, password reset email/code steps, confirmation mismatch handling, successful completion and 360px overflow checks. Both `/account-recovery` and `/forgot-password` were exercised. Email delivery and reset completion were mocked in the browser; no account was changed or email sent.
- Screenshots: `screenshots/password-reset-email-mobile.png` and `screenshots/password-reset-code-mobile.png`. These are browser test captures and contain a fixture email and mock response.
- Reviewed dashboard captures: `screenshots/public-dashboard-dholuo-desktop.png`, `screenshots/public-dashboard-dholuo-mobile.png`, `screenshots/admin-dashboard-dholuo-desktop.png` and `screenshots/admin-dashboard-dholuo-mobile.png`. Label baselines and surrounding whitespace were corrected after visual inspection.

## Remaining acceptance work

The source catalog has 1,837 interface entries and 209 seeded Dholuo values; database collection/field translations and saved administrator overrides add further wording at runtime. Missing Dholuo wording falls back to English. Fluent-speaker review and completion of the missing translations are still required; the new short reset translations are draft seed wording. English content must also be supplied through the existing editorial workflow for records that lack it. This review does not claim that every record or label is fully translated.

Live configuration check failed with: "Configure SendGrid or Resend, a verified sender address, and an API key first." Real reset emails therefore remain blocked until the institution supplies this configuration in Super Admin → System → Email (or through `EMAIL_PROVIDER`, `EMAIL_FROM` and `EMAIL_API_KEY` on the server). Actual email arrival was not tested. No credentials were printed and no email was sent during the configuration check. The browser test uses mocked responses; backend tests use isolated database/email fixtures.

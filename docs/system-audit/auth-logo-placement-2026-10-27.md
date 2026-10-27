# Authentication logo placement

The login, registration and recovery pages now place the configured JOOUST crest in the introduction column, outside the form. On desktops it can fill 540px of the left column at full opacity; the application mark above it is 64px. Supporting copy sits below the crest. The form has an opaque white background and no institutional watermark.

On phones the introduction is in normal document flow. The crest is approximately 218–220px wide and sits above the form, with a separate gap. It cannot cover the form as the page scrolls. The crest retains its proportions, and future administrator logo uploads continue to work.

## Verification

- Real Chrome checks passed for both login and registration at 1366px, 390px and 320px: logo and form do not overlap, full logo opacity, no institutional image inside the form, and no horizontal page overflow. See `auth-logo-placement-2026-10-27.log`.
- Type checking passed. Targeted linting passed with one existing image optimization warning.
- All 14 existing branding and authentication tests passed.
- Screenshots: `screenshots/login-logo-1366.png`, `screenshots/login-logo-390.png`, `screenshots/login-logo-320.png`, and matching `register-logo-*` files.

## Image quality limit

The currently configured JPEG is only 212 pixels wide. Removing opacity fixes its faded appearance, but enlarging that original cannot restore missing detail. The official university website assets inspected did not provide a sharper standalone replacement, so the approved uploaded artwork was retained. For sharp rendering on large/high-density screens, an administrator should upload an original crest at least 1080 pixels wide through Background & appearance. This guidance is also shown beside the upload control.

No branding settings, accounts or official artwork were altered during verification.

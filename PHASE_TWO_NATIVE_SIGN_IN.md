# Phase two: native sign-in and shared account history

> Update, 14 October 2026: protected Android/iOS storage adapters and rotating session renewal are now implemented. See [the current renewal increment](PHASE_TWO_NATIVE_SESSION_RENEWAL.md). The memory-only description below records the earlier proof; use the delivery plan for actual device acceptance and remaining work.

Implementation increment, 12 October 2026. This is a development proof, not completion of the identity milestone or a store-ready release.

## What was added

- Installed Android/iOS clients can start Sign in or Create account in the system browser using the existing web forms and central accounts. Login/registration links, password registration, pending/failure returns, Google rejection and Google profile completion preserve a validated app-approval destination.
- The signed-in person explicitly selects **Continue to app**. The backend issues a two-minute, single-use authorization code bound to the app's SHA-256 PKCE challenge. The callback includes a random state; no bearer token, password or account role is placed in that URL.
- The app verifies the callback address and state, then exchanges the code and its in-memory verifier for a separate ten-minute device session. The backend stores hashes of codes and device tokens in the existing verification-token/session tables. No schema change or copying/recreating users is needed.
- Account and saved-chat APIs accept the device bearer token or the existing same-origin web session. They resolve the current active user and current roles from the central database, and history is restricted to that user's ID. A rejected bearer token cannot fall back to a different browser identity.
- Web `/account` and mobile `#/account` use the same React account/history screen, with Recent/Archived filters, loading, errors and retry. The web account menu links to it. This increment displays chat history summaries; the full shared message/chat interface remains separate work.
- Device sign-out revokes that device token and clears its local state. It does not sign out other devices or the system-browser account. Expired/suspended accounts cannot use the personal APIs.
- Official Capacitor App/Browser plugins and matching callback registrations are added to both native projects. Backend/public-library secrets are not bundled into the clients.

## Configuration and testing

For normal Android/iOS builds, the bundled client's `VITE_API_ORIGIN` must be a reachable HTTPS backend with these new routes deployed. The previous live deployment does not yet contain this increment. Native sign-in rejects HTTP by default. Use the existing provider/database settings on the backend; do not put private credentials in VITE variables.

For the user's local USB Android test, `build:android:usb` explicitly enables a native build constant using `-PluoUsbAuth=true`. The Android bridge permits this only when both `BuildConfig.DEBUG` and `USB_AUTH_ENABLED` are true. The shared sign-in coordinator additionally restricts it to `http://localhost:3000` or `http://127.0.0.1:3000`; the phone must have `adb reverse tcp:3000 tcp:3000`. It is a local HTTP development connection, not HTTPS or a distribution setup. Normal debug builds default to false, release builds keep false even with that Gradle property, and iOS has no enabling bridge. Changing a VITE variable cannot enable the native exception. The debug-only network policy still permits HTTP only for the named loopback hosts.

The app checks backend availability before opening the existing login/registration screen. User-facing failures provide a connection/update message with a dismiss control, rather than displaying environment-variable instructions. PKCE, state, single-use grants, explicit approval, owner-only history and server-side active-account/role checks remain enforced. The native bridge follows the official [Capacitor custom Android code](https://capacitorjs.com/docs/android/custom-code) registration pattern. [Android network security configuration](https://developer.android.com/privacy-and-security/security-config) documents the platform's traffic-policy controls.

The provisional callback is `org.jooust.luoheritage.dev://auth/callback`. Its registered Android and iOS scheme matches the shared contract. Confirm the institution's final identifiers and claimed HTTPS app links before distribution. The return flow follows the external-browser and PKCE protections described by [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252), using the official [Browser](https://capacitorjs.com/docs/apis/browser) and [App](https://capacitorjs.com/docs/apis/app) plugins. This custom bridge is not a claim of a complete OAuth/OIDC authorization-server implementation.

Private cross-origin reads allow only the three standard local Capacitor origins, with explicit Authorization/Content-Type preflight headers and no credentialed-cookie CORS. Public preview origin configuration does not open personal APIs. Browser authorization additionally requires a same-origin JSON POST and an authenticated active account; client-supplied identities, roles and redirect URLs are rejected.

All new automated tests use mocked database services. No real account, research record, conversation, schema, session or verification token was changed during these tests. Real sign-in necessarily creates short-lived authentication rows when a person uses it.

## Remaining identity work

- Complete actual Android/iPhone sign-in, callback, account-switching, background/cold-start and sign-out acceptance. USB development form-opening checks are separate from distributed HTTPS and iPhone acceptance.
- OS-protected device storage, persistent login, refresh rotation/reuse detection, a device/session management screen and expired-row cleanup. This proof deliberately keeps secrets in memory: restarting the app or reaching ten minutes requires another sign-in.
- Account recovery, verification, self-deletion/retention rules, institutional SSO/MFA, additional provider integrations and production abuse controls/auditing.
- Full shared administration, contribution and other feature screens. Shared chat/message screens are implemented separately; native bearer sessions cover their versioned APIs and the account/history APIs. Existing web/admin APIs keep their own web-session permission rules.
- Institution-owned permanent identifiers, signing, store enrollment/review, deployment configuration and final security/device acceptance.

Latest verification results are recorded in PHASE_TWO_DELIVERY_PLAN.md. This document does not certify the complete PRD/NRF scope or a native release.

Commit message: `feat: add PKCE native sign-in and shared account history screens`

# Android and iOS: protected login and session renewal

Development increment, 14 October 2026. Web, Android and iOS continue to use the existing central accounts, permissions, database and saved chat history. This increment adds the session code; it does not complete all Phase Two features or certify a store release.

## What changes for a user

- The app can keep login when it closes and opens again, using protected storage on the phone.
- A short access session lasts at most ten minutes. When online, the app renews it without asking for a password each time.
- Renewal stops after thirty days from that device's sign-in. The user must then sign in again. Account suspension or deletion also stops access.
- Signing out clears the app's account view and local login. If the server is unreachable, the app retains only a protected sign-out request and sends it when it reconnects. It does not restore that signed-out account.
- Restarting the app while the browser sign-in form is open can recover the pending sign-in proof for up to ten minutes.
- Renewing the same account does not reset the open chat or its unsent question. Account switching and sign-out clear personal views.
- An account/history response started under an older session cannot repopulate the screen after sign-out or account switching. Account loading and archive filters reset when the identity changes.

An internet connection is still required for personal account/history requests. Protected login storage is separate from the unfinished offline lessons, content downloads and submission queue.

## Shared backend

The backend reuses the existing `sessions` and `verification_tokens` tables. There is no schema migration, reseeding, user copying or research-content change for this increment.

Authorization codes and access/renewal credentials are random. The backend stores their hashes, not raw credentials. Each sign-in has a separate device family. Renewal atomically consumes the old renewal credential, invalidates the previous access credential and issues replacements. Its absolute expiry does not extend. Access expiry cannot exceed that absolute expiry.

Used renewal hashes remain until the family expires, allowing a replay to revoke the whole affected device family. Another device family is unaffected. Revocation requires a complete access or renewal credential; knowing the public family identifier does not allow revocation.

Account and chat APIs still check the current central user's status and permissions. Invalid bearer credentials never fall back to a different browser account.

The new endpoint is `POST /api/v1/native/refresh`. Its payload is only `{ refreshToken }`; it accepts no caller-selected user or role. Existing exact native authentication endpoints, including refresh, are delegated through web middleware to their own handlers. Private native CORS remains restricted to the three existing Capacitor origins and does not enable cookie credentials.

## Protected platform storage

Android uses a local Capacitor plugin, AES-256-GCM and a non-exportable Android Keystore key. Every write gets a fresh initialization vector. The application package and entry name are authenticated with the ciphertext. Only ciphertext is stored in the private preferences file; backup and device-transfer exclusions remain enabled. Corrupt ciphertext fails closed and the app requires a new login.

iOS has a local Keychain plugin using `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, with synchronization disabled. An installation marker excluded from backup prevents a reinstallation from inheriting an old Keychain login. Both the storyboard and scene launch paths use the controller that registers the plugin, and its Swift files are included in the Xcode target. iOS native compilation and actual Keychain/device checks still require macOS/Xcode and have not been established by Android compilation.

The shared adapter has no plain-text localStorage or Preferences fallback. It persists pending PKCE context, session credentials and bounded pending revocations in one origin-bound state. Changing the configured backend does not silently reuse another origin's credentials. No password, database connection or provider secret is stored in this state.

The Android implementation follows [Android Keystore guidance](https://developer.android.com/privacy-and-security/keystore). The platform adapters use Capacitor's [Android](https://capacitorjs.com/docs/android/custom-code) and [iOS](https://capacitorjs.com/docs/ios/custom-code) registration patterns. Renewal rotation and replay handling follow the relevant protections in [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14); this custom bridge is not a complete OAuth/OIDC authorization server.

## Failure and restart handling

- Simultaneous account/history/chat reads share one renewal request.
- A temporary network or service failure keeps the protected renewal state for a later retry. It does not send cookies or select a different account.
- A rejected or absolutely expired renewal clears the local identity and asks for sign-in.
- Sign-out during authorization exchange or renewal cannot reactivate an old session when the response arrives later.
- Writes are serialized with snapshots so an older write cannot overwrite a later signed-out state.
- A protected-storage failure prevents opening a new browser sign-in before the pending proof is saved. A newly issued session that cannot be saved is revoked where the connection permits it.
- Pending sign-out requests retry when the app resumes, when its connection comes online, and on periodic native checks after the account screen has been cleared.
- If both saving local sign-out and reaching the server fail, the app cannot confirm durable logout. Its error tells the user to reconnect and try again before closing. A storage failure must be resolved rather than assuming the previous saved login was erased.
- Renewal is not retried as an arbitrary repeated write. If the server consumed a renewal token but its response was lost, retry can trigger replay protection and require sign-in again. This is a deliberate security boundary, not a promise of seamless recovery in every interruption window.

The USB development exception remains limited to an explicit Android debug build and localhost/127.0.0.1 on port 3000. Ordinary distributed builds still require the updated backend over reachable HTTPS. iOS has no USB HTTP authentication exception.

## Device checks

Follow [ANDROID_USB_TESTING.md](ANDROID_USB_TESTING.md) to compile/install the development APK and connect to the local backend. The additional debug-only check is:

```powershell
$env:ANDROID_HOME = 'D:\Android\Sdk'
node scripts/smoke-android.cjs --storage-check
```

This check encrypts, commits and decrypts a random scratch value through the installed native plugin, then removes that scratch entry. It does not read or replace the user's login entry. It proves the Android storage primitive and bridge work on that phone; it does not prove a complete authenticated cold-start/renewal journey.

User acceptance still needs: sign in with an existing account, approve the app return, verify the correct account/history, close/reopen, cross the access-expiry boundary, switch accounts and sign out. Repeat over deployed HTTPS and on an actual iPhone. Opening a browser form alone is not successful sign-in evidence.

## Remaining work

Device/session management and sign-out-all, scheduled expired authentication-row cleanup, actual concurrency/load acceptance, full identity recovery/verification/deletion/SSO/MFA, all shared feature screens, native media, offline learning/sync, push and full PRD/NRF acceptance remain tracked work. Permanent platform identifiers, signed releases and store submission are also separate.

The latest test/build/device results belong in [PHASE_TWO_DELIVERY_PLAN.md](PHASE_TWO_DELIVERY_PLAN.md).

The isolated built-UI race check is `node scripts/smoke-mobile.cjs --identity-boundary`, with the local backend and built mobile preview running. It mocks native storage and personal responses to force delayed account/history results through the actual UI after sign-out. It does not exercise real Keystore/Keychain encryption. `node scripts/smoke-native-renewal.cjs` separately checks the local backend with unused dummy credentials and public metadata reads.

Commit message: `feat: add protected native login storage and rotating session renewal`

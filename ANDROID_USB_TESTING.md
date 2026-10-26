# Android development testing over USB

> Update, 14 October 2026: the mobile client now has Android Keystore protected persistence and rotating renewal. The earlier memory-only limitation below describes the preceding proof. See [current session behavior and device checks](PHASE_TWO_NATIVE_SESSION_RENEWAL.md), including `node scripts/smoke-android.cjs --storage-check`, and the delivery plan for the actual acceptance status.

The SDK setup now has API 36, Build-Tools 36.0.0, Platform-Tools, Command-line Tools and the emulator on D:. Java 21 is configured for Gradle 8.14.3. The emulator acceleration check confirmed usable WHPX. These prerequisites do not by themselves prove an APK build or device acceptance; the latest actual result belongs in the delivery plan. The explicit USB debug build now supports testing the existing login/registration forms as well as the public library.

## Local public-library test

1. Run the current production web build locally at `http://localhost:3000` with the existing database configuration. Check that `/api/v1/bootstrap?language=luo` returns a successful JSON response.
2. Connect the phone with a data-capable USB cable, enable USB debugging and accept the debugging prompt on the phone.
3. From the project root, build the development client:

```powershell
npm --prefix clients/mobile run build:android:usb
```

This explicit mode checks the local backend and native prerequisites, bundles/synchronizes the shared client, compiles the debug APK and runs Android lint. The default `build:android` retains the HTTPS distribution-backend check.

4. Forward the phone's local port to the laptop, install the development APK and launch it:

```powershell
& 'D:\Android\Sdk\platform-tools\adb.exe' -d reverse tcp:3000 tcp:3000
& 'D:\Android\Sdk\platform-tools\adb.exe' -d install -r '.\clients\mobile\android\app\build\outputs\apk\debug\app-debug.apk'
& 'D:\Android\Sdk\platform-tools\adb.exe' -d shell am start -n 'org.jooust.luoheritage.dev/.MainActivity'
```

Keep the USB connection and backend running for this test. The debug Android manifest permits HTTP only for `localhost` and `127.0.0.1`; other destinations retain the encrypted-traffic policy. The overlay/resources belong to the debug source set, so they are excluded from the release manifest. See [Android network security configuration](https://developer.android.com/privacy-and-security/security-config).

Reapply `adb -d reverse tcp:3000 tcp:3000` after reconnecting USB or restarting ADB. The mapping can disappear during a long setup/build session even while the app remains open. The native smoke helper checks it before waiting for the library, so a missing mapping is reported immediately. It does not change phone-wide networking.

Keep the phone unlocked with the app visible while checking layout. A sleeping/hidden Android WebView can report a zero-width viewport, so that state cannot prove a layout defect. The read-only `node scripts/smoke-android.cjs` helper inspects only this development app's WebView, checks visible layout/library/navigation/network recovery and restores network simulation afterward. It does not send AI questions or modify accounts/content.

Check launch/icon, overview, language change, sidebar opening/navigation, published library content, image/view filters, phone layout, lost-connection retry and the account sign-in boundary. Reading the public library should not create research records or change publication permissions. Avoid submitting contributions, deleting real chats or sending provider requests as part of a read-only test.

## Local Android login and account testing

For this explicit USB debug APK, keep the phone connected, the app visible and the current local backend running. Select **Sign in** for an existing account or **Create account** for registration. The phone opens the same forms as the website in its system browser. After successful sign-in, select **Continue to app** (or **Return to app** if the browser needs a second tap). The app should return to My account and load that account's saved chats. Existing accounts should sign in rather than register again; testing registration creates a real central account.

The local exception is restricted by compiled Android debug constants and the exact loopback port 3000; it does not enable HTTP in ordinary native or release builds. It uses local HTTP through ADB forwarding, so it is a development test rather than distribution/security acceptance. Before distribution, configure a reachable HTTPS `VITE_API_ORIGIN` with the current native/account/chat APIs deployed, rebuild/sync without USB mode and check identity, roles, history, expiry, account switching and sign-out on real devices. Do not put backend/store secrets in frontend variables.

`node scripts/smoke-auth-forms.cjs` checks the real local login/registration links and layout in an isolated browser profile without submitting credentials. `node scripts/smoke-android-login.cjs` opens the app's Sign in button and checks only the visible app-owned browser form or existing-session approval screen. It leaves the browser open for manual sign-in and never reads/submits passwords or approves authorization. Add `--register` to check Create account without submitting registration. Use `ANDROID_HOME=D:\Android\Sdk` in the terminal environment for these helpers.

The current device session is still memory-only and short-lived. Persistent protected login/refresh, complete mobile screens, offline features, signed releases and full PRD/NRF acceptance remain tracked work. A debug APK is not a Google Play release bundle; no iOS compilation or store approval follows from this Android test.

## Build download

The Gradle wrapper uses the smaller official 8.14.3 binary distribution with the published SHA256 pinned. First compilation also downloads Android/Maven dependencies into the configured Gradle cache on D:. Later builds can reuse them. [Gradle wrapper and checksum verification](https://docs.gradle.org/current/userguide/gradle_wrapper.html).

Windows SDK property paths use escaped drive colons, such as `sdk.dir=D\:/Android/Sdk` in the ignored Android `local.properties` file. The same escaping applies to the local Java-home property. Android lint checks this even if compilation accepted an unescaped path.

Local database connection/pool timeouts were increased to thirty seconds after the default connection window caused repeated bootstrap failures during setup. The database, credentials and other environment settings were preserved. This allows a cold/slow connection to recover; it does not establish the NRF loading-time targets. The template documents the parameters, while the actual credentials remain in the ignored local environment file.

The mobile library/account reads now have a forty-second limit, allowing the backend's thirty-second database connection window to return an error or result. Reads are still cancelled on navigation and failures still expose a retry button. This avoids the previous premature twenty-second cancellation; it is not a loading-speed fix. A separate local server/cloud connection failure was observed after the native build: a fresh database connection succeeded while older server connections failed. Restarting the local review server restored reads, but long-idle recovery, cloud connection stability and NRF performance acceptance remain open.

On narrow phones, Chat and Language use a second header row so the app name stays visible beside the icon and sign-in control. Desktop keeps the controls in one row. The same bundle is copied into the Android and iOS projects; iOS compilation/device acceptance remains separate.

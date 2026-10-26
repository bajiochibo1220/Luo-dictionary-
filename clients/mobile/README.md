# Shared mobile client: foundation preview

This development preview bundles the actual web overview, sidebar and module-content presentation, local design CSS/fonts and Luo Heritage icon. It reads active languages/modules and **only governed, published content** through the versioned APIs from the existing backend. The same query service powers the web dashboard. Development checks preserved the existing schema and research records; using sign-in and saved chat creates the corresponding authentication/history records.

This is a technical proof, not a release-ready Android/iOS application. Installed apps now have a system-browser sign-in bridge, a bundled shared account/saved-chat screen and the same shared chatbot interface as the web; contribution and other unbundled destinations open the current web host. Persistent native login/secure storage, offline packs/sync, complete role screens, camera/audio/push and full PRD/NRF modules remain milestones in [the delivery plan](../../PHASE_TWO_DELIVERY_PLAN.md). See [native sign-in scope and setup](../../PHASE_TWO_NATIVE_SIGN_IN.md) and [shared chat scope](../../PHASE_TWO_SHARED_CHAT.md).

## Run

From the repository root:

```powershell
npm --prefix clients/mobile ci
# Enable this public development origin in the backend's .env.local:
# APP_PUBLIC_CLIENT_ORIGINS=http://127.0.0.1:5173
# Then restart the Next.js server.
npm --prefix clients/mobile run dev
```

The API defaults to http://localhost:3000. For a different backend create clients/mobile/.env.local with VITE_API_ORIGIN set to an HTTPS origin (HTTP is allowed only for localhost/127.0.0.1 development). Backend secrets never belong in VITE_* variables: they become public bundle contents. Production must point to a backend with these new endpoints deployed; the previous live deployment does not contain them yet.

```powershell
npm --prefix clients/mobile run build
```

This creates a local dist/index.html plus bundled assets, suitable for Capacitor's webDir; no server.url remote wrapper is configured. Public responses use no-store, and the preview deliberately does not persist research content or provide an offline-download claim.

For a browser check of the production bundle, start npm run preview in this directory (default http://127.0.0.1:4173), configure that origin in the backend's APP_PUBLIC_CLIENT_ORIGINS, and run node scripts/smoke-mobile.cjs from the repository root. The check covers live published content, desktop/mobile navigation, view/language controls and failed-network recovery without submitting forms or changing records. Use MOBILE_SMOKE_URL if the preview runs on another address. This browser check passed on 12 October 2026; native device/build acceptance is still pending.

## Native prerequisites

Capacitor 8 packages/configuration and separate Android/iOS source projects are included. The configured org.jooust.luoheritage.dev identifier is **development-only**; obtain the permanent institution-owned identifier before registering store applications. Build and synchronize the shared screens to both projects:

```powershell
npm --prefix clients/mobile run native:sync
npm --prefix clients/mobile run assets:native
npm --prefix clients/mobile run doctor
```

Android compilation requires the compatible Android Studio/JDK/SDK toolchain. iOS compilation/signing requires macOS/Xcode or an institution-configured Mac build service. Neither signing nor store verification has been completed. Follow [the account setup guide](../../STORE_ACCOUNT_SETUP.md) for institutional enrollment, ownership, fees and release-console settings.

This Android project uses Gradle 8.14.3 and Java 21 source compatibility. Use Java 21 for JAVA_HOME and the Android Studio Gradle JDK. Recent Studio versions can bundle Java 25 for the IDE itself; Java 25 requires Gradle 9.1+ and is not supported by this project's current wrapper. Keep the IDE runtime and project build JDK configured separately. The environment doctor checks this distinction. [Gradle Java compatibility](https://docs.gradle.org/current/userguide/compatibility.html).

Use native:sync:android or native:sync:ios for one target. The native source/resource folders belong in Git; copied bundles, build caches, local SDK paths and private signing files are ignored. See [SHARED_APP_ARCHITECTURE.md](../../SHARED_APP_ARCHITECTURE.md) for folder ownership and shared account/history rules.

The environment doctor reports pending prerequisites and exits nonzero when they are missing. It checks the public backend without credentials or database writes. Localhost is a browser development default, not a reachable production backend on a phone; configure a reachable HTTPS VITE_API_ORIGIN and deploy the new APIs for native distribution.

Protected account and conversation-history APIs reuse the existing users/history and support web sessions plus short-lived native bearer sessions. Normal builds require a reachable HTTPS backend with the new APIs deployed. The explicit Android USB debug mode described below supports local login/registration testing. Device tokens and pending PKCE verifiers remain in memory for this first proof; ten-minute expiry or restarting the app requires sign-in again. OS-protected persistent storage/refresh and complete Android/iPhone acceptance remain pending. Do not enable public credentialed-cookie CORS as a substitute.

## Current boundaries

For explicit Android library/login/registration testing through a USB-connected phone and the local backend, use `npm run build:android:usb`. The debug-only network configuration permits localhost HTTP, and `adb reverse tcp:3000 tcp:3000` connects the phone's local port to the laptop. The compiled native bridge enables local authentication only in this explicitly selected Android debug mode on loopback port 3000. Ordinary and release builds retain HTTPS requirements, and iOS has no enabling bridge. Follow [ANDROID_USB_TESTING.md](../../ANDROID_USB_TESTING.md); this mode does not turn a local HTTP endpoint into a store/distribution backend.

Edit shared/mobile source files in `src/components/shared`, `src/lib` and `clients/mobile/src`. Files in Android/iOS copied `public/assets` folders are generated by the build/sync commands and should not be edited directly.

The shared chat increment bundles `/chatbot`, saved-message reading with earlier-page loading and owner-only rename/pin/archive/delete actions. Web and mobile use the same component and versioned services. See [PHASE_TWO_SHARED_CHAT.md](../../PHASE_TWO_SHARED_CHAT.md) for processing consent, CORS rules, tests and remaining work.

Development build commands are `npm run build:android` and, on a Mac, `npm run build:ios` in this directory. The manual [GitHub workflow](../../.github/workflows/mobile-development.yml) prepares debug APK/simulator artifacts; it has not run and is not a signed store-release workflow. See [configuration locations](../../PHASE_TWO_CONFIGURATION_GUIDE.md) before adding environment variables.

- First page of public content matches the web's current bounded query: 50 cultural records plus up to 100 dictionary entries. Full pagination belongs to the library feature milestone.
- Public API CORS permits the standard Capacitor localhost origins and explicitly configured browser development origins; it does not enable credentialed cross-origin access.
- Native sign-in now uses a system-browser/PKCE bridge with hashed short-lived device sessions; it does not copy browser cookies or grant privileges from client state. Protected persistence/refresh and native-device validation remain pending.
- A successful browser bundle build does not demonstrate a signed AAB/IPA, real-device behavior, complete feature parity or store approval.

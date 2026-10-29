# Universal chatbot shortcut and sidebar installation

The CULTURAL HERITAGE shortcut now appears on social feeds, public collection screens, authentication/information pages and administrative pages. It mounts once in the web root; the shared web/native application supplies its own hash-route shortcut. The shortcut is omitted while the chat is already open. The CSS rule hiding it on feeds was removed, and safe-area positioning is retained.

Install the app is the first action in public and administrative sidebars. An early script retains browser install offers before React hydrates. A single-use prompt is called directly from the click gesture; cancellation and failure show actionable feedback. Without an offer, the same button opens installation instructions, including Safari's Share/Add to Home Screen steps for iPhone/iPad. Installed/standalone/native apps hide the redundant install action. The public offline shell caches the early helper too.

Browsers control whether a native installation prompt is available; the app cannot force one in unsupported browsers. See the [browser installation guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt).

Verification:

- 37 focused tests passed: install lifecycle/early capture, first sidebar action, shortcut coverage, navigation, authentication presentation, manifests and learning/offline contracts.
- 19 production browser checks passed at 320, 390 and 1440 pixels, plus authentication/information routes. The shortcut was visible, within the viewport, clickable and opened chat. Manual installation instructions, cancellation, consumed-event protection, prompt failure and installed state passed. Chrome reported no installability errors. [Browser evidence](shortcuts-install-browser-2026-10-29.json).
- Offline browser acceptance passed for shell reload, downloaded lesson text, persisted progress queue, reconnect synchronization, stored contribution text/files and deletion of local drafts. Library control/layout checks passed at 360 and 1440 pixels.
- Website and mobile production builds passed. Lint found no errors; existing image/module/bundle warnings remain.
- The Android development APK was rebuilt. All 31 bundle files match Android, iOS and the APK byte for byte. [Bundle evidence](shortcuts-install-native-bundles-2026-10-29.json).

Browser install prompts were synthetic; no OS installation was approved. Physical Android/iPhone installation and iOS compilation remain the device acceptance steps described in the [cross-platform review](final-platform-review-2026-10-29.md). Changes are local, without a production deployment.

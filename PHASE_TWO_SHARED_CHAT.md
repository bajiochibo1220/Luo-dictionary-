# Shared web, Android and iOS chat

Development increment, 12 October 2026. This implements part of the chatbot/account milestone; it does not complete the fifteen-module PRD or the full NRF repository.

## Implemented

- The existing chat design now lives in one React component used by the website and bundled mobile client. Mobile Chat and saved-chat links open that component inside the app.
- Web requests use the existing web login. Installed apps use their own short-lived device token, referring to the same central user and conversation records.
- Users can open saved messages, load earlier messages, rename, pin/unpin, archive/unarchive and delete their own conversations. Failed deletion is reported accurately.
- Both legacy and versioned endpoints use the same ownership-checked services. Clients cannot choose a user or role in a request. Writes check the owner again in the database operation.
- Chat validates question/settings/history limits and requires an explicit AI-processing choice. Signed-in history comes from that user's stored conversation; injected client history cannot replace it.
- Existing retrieval continues to use approved public content. Source chips now link to the existing public detail routes; mobile source-detail screens are not yet bundled.
- Provider failure creates no empty chat. A new conversation and answer are saved in one transaction after successful generation. Suspension is checked again before saving.
- Visible loading/errors/retry, keyboard/touch controls, mobile wrapping and recovered questions replace silent failures. Anonymous follow-up history is bounded, including long catalog answers.
- Native tokens are never sent to arbitrary destinations or stored in navigation metadata. Only public navigation configuration is reused in memory for at most thirty seconds; library content and personal history stay fresh.

## APIs and origin rules

- `POST /api/v1/chat`: common chat processing, same-origin browser sessions or native bearer identity; governed anonymous questions are also supported.
- `GET/POST /api/v1/account/conversations`: owner history and validated chat creation.
- `GET/PATCH/DELETE /api/v1/account/conversations/{id}`: own messages/settings/deletion. Message reads page in batches of one hundred exchanges, with an earlier-page cursor. The history summary currently returns the latest one hundred conversations.
- Native private preflight permits only the established Capacitor origins and never enables credentialed-cookie CORS. The existing `APP_PUBLIC_CLIENT_ORIGINS` setting additionally permits **anonymous chat only** in explicitly configured browser previews; it does not grant bearer/history access to those origins.
- Cookie-authorized mutations require their own origin and JSON content type. Rejected device tokens cannot become anonymous requests or another browser account.
- Response caching is disabled. Failures do not reveal provider/database credentials. Central AI quota limits apply to the existing account across clients.

## Build preparation

`npm --prefix clients/mobile run build:android` builds shared assets, checks prerequisites, syncs Android, then runs Gradle debug compilation and Android lint. `build:ios` performs the corresponding macOS/Xcode simulator build. The script fails clearly for missing prerequisites or an attempted unprepared store release.

The manual GitHub workflow at [.github/workflows/mobile-development.yml](.github/workflows/mobile-development.yml) prepares checks, a development APK and an unsigned iOS simulator artifact. It has not been executed on GitHub. Enter the **public HTTPS API origin** when starting it; it must point to the backend with these APIs deployed. The simulator artifact is not an installable iPhone/store IPA. The workflow neither deploys the web backend nor publishes to stores.

Later local Android verification generated and installed a lint-checked development APK. Visible public-library/navigation/layout/retry and signed-out shared-chat/account boundaries passed on the Android 10 USB phone. The chat send button stayed disabled before processing permission; this phone check sent no AI question and created no conversation. The GitHub/iOS pipelines, native HTTPS account testing and live authenticated chat acceptance remain pending. See [Android USB setup](ANDROID_USB_TESTING.md) and the latest delivery-plan entry for that separate result.

GitHub's [macOS runner inventory](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md) documents the macOS/Xcode environment used by the workflow. [Capacitor environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup) explain why iOS compilation still needs a Mac environment.

## Still required

Actual HTTPS/native sign-in and chat acceptance on Android and iPhone; secure persistent sessions/refresh; durable send idempotency for uncertain network outcomes; history-list pagination beyond one hundred conversations; conversation retention/deletion policy; consent audit/withdrawal propagation into prior responses, indexes and exports; expert AI/source evaluation; production deployment and release signing. The current user-controlled processing flag is not the complete NRF consent repository.

Phone contribution/admin screens, offline packs/sync, curriculum/progress, camera/recording, push and the other PRD/NRF work remain in the main completion checklist. No trained Dholuo model, complete tutoring, or store readiness is claimed.

Existing database schema/accounts/research content were preserved. Automated service tests use mocked databases. Browser AI-response tests intercept requests and do not create live conversations or charge a model provider.

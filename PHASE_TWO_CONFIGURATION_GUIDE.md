# Where configuration belongs

Web, Android and iOS use the same backend and existing database. The same server user ID owns accounts, chats and later progress/saved items. Provider secrets are held by the backend; they are not copied into every application.

| Setting | Location | What it does |
|---|---|---|
| Database URLs, Auth.js secret, private Google OAuth secret, media/AI/email credentials | Private server `.env` locally; protected backend hosting environment variables in the cloud | Connects the shared backend and providers. Existing database records must be preserved. |
| `VITE_API_ORIGIN` | `clients/mobile/.env.local` or mobile build environment | Public HTTPS address of that backend. This value is embedded in the app and is not a secret. |
| `APP_PUBLIC_CLIENT_ORIGINS` | Backend environment, only when using browser previews | Explicit preview origins for public library/configuration and anonymous chat. It does not allow cross-origin account cookies or private history. |
| Android signing keystore and passwords | Institution-controlled private build storage / encrypted CI secrets | Signs Android releases. Keep out of Git and frontend variables. Signing integration and permanent identifier confirmation remain. |
| Apple signing certificates, profiles and App Store Connect API private key | Institution-controlled Mac/build system / encrypted CI secrets | Signs/exports/uploads iPhone releases. These are separate from web login credentials. Enrollment and build configuration remain. |
| Google Play publishing service-account credentials | Encrypted release-CI secret, after JOOUST configures access | Allows an authorized uploader to submit a signed bundle. It does not create the Play Console organization account. |
| Apple login service identifiers/private keys | Protected backend OAuth configuration after Apple setup | Enables the required login integration; store upload credentials alone do not provide Apple sign-in. |

Do not place database URLs, private provider keys, passwords, keystores or store private keys in `VITE_*`, `NEXT_PUBLIC_*`, mobile source files or the chat. These frontend variables become public app contents.

The prepared development workflow needs a public backend URL and the native toolchains, not publisher credentials. Its outputs are development artifacts. Before production there is still permanent app identity, native device acceptance, signing ownership, privacy/deletion/support resources, listings/testing and store review, as well as the outstanding application features. Follow [STORE_ACCOUNT_SETUP.md](STORE_ACCOUNT_SETUP.md) for organization enrollment.

JOOUST's later database/media/server migration remains a separate agreed milestone. A cloud development implementation does not establish NRF local-infrastructure acceptance.

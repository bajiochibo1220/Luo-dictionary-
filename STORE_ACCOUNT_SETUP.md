# Luo Heritage store-account setup

Prepared 12 October 2026. Neither publisher account is ready, according to the project owner. Account registration, identity checks, payment and acceptance of publisher agreements are performed by JOOUST's authorized account holder. App development can proceed while verification is pending. Do not share passwords, private keys or payment details in chat.

## Google Play Console

1. Open [Play Console registration](https://play.google.com/console/signup) with a JOOUST-controlled Google account. Use Organization for the institution's publication; provide accurate legal/verification information. Google currently charges USD 25 once. [Registration instructions](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).
2. Complete organization verification and contact checks. Have the institutional legal name/address, website, contact details and D-U-N-S record available. Government-entity exceptions require Google's determination; do not assume the university is exempt. [Required account information](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en).
3. When verified, use **All apps → Create app**. Enter **Luo Heritage**, choose the app's primary listing language, App, and Free as specified by the project proposal. Follow the declarations. Establish the Android package identifier once the institution-owned namespace is confirmed; it is a permanent application identity. [Create an app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en).
4. In **Users and permissions**, give named developers the access needed for this app and testing/releases, while retaining account ownership with JOOUST. Use individual access rather than shared passwords.
5. Complete **Main store listing**, **Store settings**, and dashboard **App content** tasks: descriptions, icon/screenshots, category, support contact, privacy-policy URL, Data safety, ads declaration, target audience, content rating and reviewer access. Answers must match the actual release and SDK behavior. Do not mark unfinished recovery/deletion/moderation as complete.
6. Configure Play App Signing and retain the upload-key recovery information securely. Upload a signed **AAB** to Internal testing, set testers and test access. Promote only after release checks and required account/testing gates pass.
7. A qualifying personal account created after November 13, 2023 requires twelve continuously opted-in closed testers for fourteen days before applying for production access. Registration as an organization is about correct institutional ownership, not avoiding verification. [Testing policy](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

## Apple Developer and App Store Connect

1. The authorized JOOUST account holder uses an Apple Account with two-factor authentication and enrolls the organization. Provide legal-entity details, binding authority and D-U-N-S information where required. The app name belongs in the app record, not in the account holder's personal-name fields. [Apple enrollment](https://developer.apple.com/programs/enroll/).
2. Membership is currently USD 99/year. Eligible educational institutions can request a fee waiver; it is not automatic. [Membership](https://developer.apple.com/programs/whats-included/), [fee waiver](https://developer.apple.com/help/account/membership/fee-waivers/).
3. After activation, use **App Store Connect → Users and Access** to invite named developers. Grant the appropriate Developer/App Manager permissions and signing-resource access as needed, keeping Account Holder ownership with JOOUST. [User management](https://developer.apple.com/help/app-store-connect/manage-your-team/add-and-edit-users/).
4. Register an institution-owned Bundle ID in Certificates, Identifiers & Profiles. Then use **App Store Connect → Apps → + → New App**: iOS, **Luo Heritage**, primary listing language, the registered Bundle ID, and a unique internal SKU. Android and iOS can use a corresponding identifier, but each signing setup is separate. [New app record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/).
5. Configure development/release signing and necessary capabilities such as push and chosen login services. A local iOS build needs macOS/Xcode; an approved hosted Mac build pipeline is another option. A Windows code editor alone does not compile or sign the iOS application.
6. Complete the app's descriptions, screenshots, support/privacy URLs, App Privacy, age rating, distribution/pricing and App Review Information. Provide a working limited reviewer account where sign-in is required. Do not supply a master-administrator account to reviewers.
7. Upload a signed release build, test through **TestFlight**, resolve failures, then select the build and submit it for App Review. Uploading to TestFlight does not make the app public; public availability requires the separate review/release step.

## Values and assets shared between stores

| Field | Planned value / action |
|---|---|
| Display name | Luo Heritage |
| Publisher | Verified JOOUST legal entity |
| Artwork | Existing book/sunrise/lake artwork, exported into each platform's required icon formats |
| Backend | Existing cloud service during development/testing; one account/content/permissions system |
| Package / Bundle ID | Confirm institutional namespace before registration; do not use a provisional ID for public release |
| Price | Free in the current project proposal; paid products need a separate product/store decision |
| Support, privacy and deletion URLs | Real public endpoints, checked before submission; deletion functionality still needs implementation |
| Review access | Dedicated least-privilege test account and clear instructions |
| Test devices | Real Android and iPhone devices, including weak-network and permission-denial scenarios |

This document is a walkthrough, not evidence that accounts have been created, signing credentials are available, or store approval has occurred. Account Holder actions and store responses are external dependencies. The app's own feature/test status is tracked in [PHASE_TWO_DELIVERY_PLAN.md](PHASE_TWO_DELIVERY_PLAN.md).

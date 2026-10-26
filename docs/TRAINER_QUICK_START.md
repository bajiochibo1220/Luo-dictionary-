# Trainer quick start — Sunday, 25 October 2026

Use the common application at **`/application`**. It uses the same interface components as the Android/iOS bundle. The older website routes continue to work.

## Start the local website

From the project root, with the existing `.env` retained:

```powershell
npm run build
npm start -- -H 127.0.0.1
```

Open `http://127.0.0.1:3000/application`. Use email/password while unconfigured external sign-in providers and message delivery await their credentials/setup. Do not run a second server on port 3000 if the review server is still running.

## Prepare training content and accounts

- Confirm the contributor, editor, cultural reviewer and publisher accounts have the correct language roles. Selecting an interest is not assigning a role.
- Choose English in the common application. Open **Lessons, games & calendar**, then **Content workspace**. Three private “Trainer guide:” lessons are prepared. Review them, confirm permission/download settings if appropriate, submit them and use an independent reviewer/publisher. They are not automatically public.
- Use invented practice material or explicitly approved content. Research-only interviews stay private.
- The current public cultural collection is small. Empty dictionary/proverb/riddle sections indicate missing approved content, not a populated training curriculum.

## Rehearse the essential journeys

1. Browse a public collection, open grid details, search, and save an item after signing in.
2. Create a private contribution, attach an approved test file, save it, reopen it and submit it.
   Use **Save on this device** to keep unfinished text and selected files locally. Reopen **Contribute & submissions**, choose **Resume device draft**, and save changes again before closing. Rehearse an offline restart. **Delete device copy** removes the local copy; it does not delete the server record. Use trusted devices for private drafts.
3. With another appropriately assigned account, request corrections; edit the original/English version; complete cultural review and publishing review.
4. Open an approved lesson, answer questions, save progress and confirm it on another signed-in client.
5. Download explicitly permitted lesson text while online. Enable airplane mode, restart the app, complete the lesson, reconnect and synchronize. Text packs do not include audio/video.
6. Review profile settings, notifications and session revocation. Actual recovery email and phone codes require configured providers and verified delivery.

## Android USB development APK

The compiled APK is at:

`clients/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

It is a development build using a localhost backend. Connect a phone with developer options/USB debugging enabled, authorize the computer on the phone, keep the backend running and use:

```powershell
adb reverse tcp:3000 tcp:3000
adb install -r "clients/mobile/android/app/build/outputs/apk/debug/app-debug.apk"
```

This preserves the application's data when replacing the existing development installation. `adb reverse` must be restored after disconnect/restart. Distributed builds require a reachable HTTPS backend and proper release/signing configuration.

No phone was connected during the implementation check. Verify actual sign-in return, recording, uploads, restart, offline progress and revocation before demonstrating them on the phone.

## iPhone

The iOS project contains the same verified shared bundle and protected-storage source. Actual iOS compilation/signing/testing requires macOS/Xcode and an iPhone or simulator. Android developer tools cannot establish iOS acceptance.

See [full implementation status](FULL_SYSTEM_IMPLEMENTATION_STATUS.md) for delivered functionality, environment configuration, verification limits and remaining full-system work. Do not present this increment as completion of all PRD/NRF requirements.

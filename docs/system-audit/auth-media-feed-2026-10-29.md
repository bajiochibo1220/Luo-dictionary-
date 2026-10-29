# Authentication, media delivery and compact feed descriptions

The shared public feed now shows a one-line description preview on phones and up to two lines on desktop. Underlined more/less controls expand inside the card without opening a dialog. Expanded descriptions stay within the scrollable caption, leaving the player and item actions available. Text-only items use the same caption controls. Explore opens the complete overview and public body, media, downloads and linked transcripts. Where available, up to four other loaded items from the same collection can be opened directly from the details.

Public text now includes the existing presentation fields for origin, county, community, clan, period and significance. Usage, meaning and museum location were already allowed. Internal metadata remains excluded; the interface shows only information actually entered by contributors or administrators.

Authentication now prevents duplicate same-tick login and registration requests. Registration also handles malformed/error server responses and a timed-out request without leaving the form stuck. A real database transaction verified account creation, email normalization, bcrypt hashing, duplicate rejection, credential verification, ordinary-user session callbacks and rejection of wrong passwords/suspended accounts. The transaction was rolled back, retaining no test account or consent row. See [transaction evidence](auth-transaction-2026-10-29.json).

Existing public images are present. The opening feed now prioritizes media-bearing collection groups while preserving every text item and the order inside each collection. Optimized image failures fall back to protected original delivery, with a visible final error if both fail. Media stays fully fitted against black unused space.

The user confirmed that audio/video have not yet been uploaded. No recordings were fabricated or restored. The current database contains 100 image assets; all 51 image IDs in each of the five recent backup snapshots remain present. Earlier snapshots contain different legacy image IDs. See [backup inventory](media-backup-inventory-2026-10-29.json). Future audio/video handling is exercised with valid synthetic recordings rather than changes to cultural records.

Verification:

- 102 focused tests passed across authentication/routing/reset, media delivery, inline descriptions, discovery ordering, public projection/publication and transcript reading.
- The mobile production build passed. Android and iOS projects received the same bundle; Android debug assembly passed. All 31 bundle files match both projects and the APK byte for byte. [Bundle evidence](auth-media-native-bundles-2026-10-29.json).

Changes remain local; this is not a deployment or physical-device acceptance. iOS compilation still requires macOS/Xcode; an iOS binary and physical device behavior were not tested here.

Final navigation, complete production browser checks and the user-deferred email setup are recorded in [the 30 October follow-up](final-navigation-2026-10-30.md).

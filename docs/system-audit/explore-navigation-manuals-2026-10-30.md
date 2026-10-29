# Explore, Back/close controls and current manuals - 30 October 2026

## Changes

- Explore opens in a native top-layer dialog instead of a dropdown inside the pinned feed toolbar. Its independently scrollable body exposes every collection and Follow your curiosity link on narrow or landscape screens. Back and X remain available; Escape closes it, navigation dismisses it, and focus returns to the trigger.
- Full item details have a sticky Back/X header. The public and administrative web headers, legacy cultural pages and shared packaged-client header include Back navigation with a public-library fallback for an empty browser history. Legal pages return through Back rather than forcing registration.
- Public, staff and downloaded account guides cover current registration-language rules, login-first entry, reset-only recovery, fixed black media filters, pinned search, inline more/less, contribution continuation, the CULTURAL HERITAGE assistant, installation, local storage and deletion. The full web manual also replaces the old separated cultural-review/editor workflow with Review & edit, paired English editing and publishing.
- Regenerated Markdown/HTML/Word/PDF manual edition 2.0, dated 30 October 2026. The final PDF has 32 pages, all eighteen sections, working contents links with verified PDF page destinations, a navigation outline and an embedded logo. HTML was checked at 360, 794 and 1200 pixels; Word XML and contents links validated.
- Terms and Privacy describe the current cultural assistant and translation, public/review-in-progress records, recovery/deletion, installation, activity processing and offline/device storage. Current feature notices supplement saved institutional policies without replacing their text. The administrator editor, public legal pages and registration consent fingerprint use the same resolved wording. Historical consent records are not changed.

## Verification

- Focused help, legal settings/consent consistency, discovery and navigation tests: 28 unique tests passed. The initial isolated header renderer lacked a router context; its test fixture was corrected and all five navigation tests passed on rerun. No application change was required for that fixture.
- Mobile production build, including TypeScript: passed. All 31 dist files match both Android and iOS copied assets byte-for-byte: [native bundle proof](explore-native-bundles-2026-10-30.json).
- Compiled mobile browser: 20 layouts from 320px phones to 1440px desktops, including 844x390 landscape and expanded/collapsed sidebars. Each discovery case verifies that Explore is modal, fits the screen, contains all 22 fixture choices, scrolls to the last clickable option, keeps X reachable, closes with Escape and restores focus. Navigation/Back and all eight collection search/filter/contribution routes passed. No runtime errors, unexpected APIs or live data writes: [mobile browser proof](explore-mobile-browser-2026-10-30.json).
- Web production build passed: ESLint had zero errors (nine existing image warnings), TypeScript passed, and all 57 pages generated. [Build log](explore-web-build-2026-10-30.log).
- Long item-details interaction passed at 390x844, 844x390 and 1440x950: complete descriptions and all 216 transcript turns remain available; both sticky Back and X stay visible, receive clicks and close the dialog. No runtime errors or live writes: [details proof](explore-details-browser-2026-10-30.json).

## Operational limits

Changes are local; no site/store deployment or physical-device acceptance was performed. Android/iOS project assets were updated, but this follow-up does not claim a newly compiled native binary. iOS compilation requires a Mac with Xcode.

The owner deferred email-provider configuration, so real recovery/deletion email delivery remains unavailable until configured. No real reset emails were sent during this review.

Institutional owner/contact/provider/retention/transfer fields remain in the legal drafts because those facts were not supplied. The operational wording does not certify legal compliance or replace institutional review. Primary privacy references checked for this update: [ODPC data-subject rights](https://www.odpc.go.ke/rights-of-a-data-subject/), [ODPC complaint process](https://www.odpc.go.ke/file-a-complaint/), and [ODPC guidance](https://www.odpc.go.ke/guidelines-2/).

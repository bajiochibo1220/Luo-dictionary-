# Mobile layout, branding and account menu follow-up

This update follows the later phone screenshots and supersedes the earlier top-toolbar/header-logo arrangement.

- The app header contains navigation, the application name and the account/sign-in control. The repeated Chat label, app icon and institutional logos were removed from browsing mastheads.
- Collection search and the original/English language selector occupy the first row. The title, community name and contribution action share a compact second row.
- All, Images, Audio, Video and Transcripts now use a fixed bottom bar with visible labels. The view switch shares that bar. The bar follows the content area's width when the desktop sidebar changes size; it stays below content and above device safe areas.
- Community selection is available from the navigation drawer. It remains separate from the original/English content-version switch.
- Uploaded JOOUST and NRF logos appear together in a prominent, aligned panel before both login and registration forms. Page footers provide consistent institutional attribution without consuming browsing-header space. Existing saved logo URLs and configured colours are reused.
- Public web, packaged-app, dashboard and administrative account menus share the same dismissal component. Each has a visible Close button and closes on avatar toggle, outside pointer input, Escape and navigation. Administrative notifications use the same dismissal behaviour. Long menus fit within the viewport and scroll internally.
- The administrative media library uses the same bottom filter placement. Private previews use the permission-checked file endpoint; document/transcript filters include both attachment types and preserve the selected collection. Expired sessions redirect to sign-in.
- The floating chatbot shortcut stays above the media bar.

## Verification

- Automated suite: [186 tests pass](mobile-layout-tests-2026-10-26.log), including updated assertions for the new top/bottom arrangement and protected administrative media previews.
- TypeScript passes. Lint reports zero errors; existing image/React-hook warnings remain. Production build results are retained in [the build log](mobile-layout-build-2026-10-26.log).
- A hydrated browser harness exercises the actual application, packaged-app, dashboard, language-admin, super-admin and legacy account-menu components at 320, 360, 390, 768 and 1440 pixels: 30 layout cases and 150 menu-dismissal interactions.
- It verifies that top search and language controls align, the top controls remain sticky, the bottom media bar stays at the viewport bottom while the actual content scroller moves, and there is no horizontal page overflow. Media filters are also exercised against fixture records.
- At 360 pixels, the main application header plus top controls measures 169 pixels, compared with 328 pixels in the preceding implementation. The bottom media bar measures 65 pixels before any device safe-area inset.
- Both actual saved institutional logos were loaded successfully on the real login and registration form components at 360 and 1440 pixels. Their displayed image boxes are 88 pixels high on phones and 112 pixels on desktop.

Evidence: [browser measurements](mobile-arrangement-verification.json), [application preview](screenshots/mobile-arrangement-application-360.png), [registration preview](screenshots/branding-register-360.png), [login preview](screenshots/branding-login-360.png).

The browser harness uses fixture accounts/content and the real saved public branding. It does not create accounts, submit real credentials or modify database records. Physical-phone testing and hosted deployment remain separate from these local checks. This update does not claim formal acceptance of all outstanding PRD requirements.

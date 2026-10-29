# Full-screen cultural media feed

The Discover feed and collection Feed views now use one full-height media card per item on desktop and phones. This replaces the earlier side-by-side media/details feed layout. The card fills the available reading pane beneath the masthead, including when the sidebar is resized or collapsed.

Titles, the available English title, category, publication/review status and a short description overlay the media. Save, complete-item ZIP download and Explore controls sit on the card. Explore retains the full description, translations, transcripts, original attachment downloads and the existing cultural experiences/3D viewer. Grid browsing remains available from the collection controls.

Attachments swipe horizontally within each item, with previous/next buttons and an attachment count. Vertical scrolling moves between items with gentle scroll snapping. Keyboard users can navigate cards with Up/Down or Page Up/Page Down and attachments with Left/Right when their gallery is focused. Hidden attachments are excluded from keyboard interaction.

Images and videos use the entire card frame and keep their complete proportions, with black unused space. Hide Details temporarily clears the caption and action rail. Audio and document items receive a full-height presentation with their real controls/links; text-only items remain readable. Other attachment types retain a link to the original file.

Playback remains user initiated. Moving to another attachment, scrolling away, opening Explore or hiding the browser tab pauses playback. Search, categories, language and media filters remain available through Browse & search; their controls do not cover the video transport controls. Save feedback and errors remain visible above the feed.

## Validation

- **20 full-height browser layouts passed:** 1440, 1366, 1024, 768, 390 and 320 pixels, plus 844×390 landscape; expanded and collapsed sidebars where available. Checked complete card/media bounds, captions/actions inside the card, unobstructed attachment navigation, and no horizontal page overflow.
- Browser interactions passed for portrait/panoramic fitting, video and audio playback, horizontal attachment changes, offscreen pausing, Save feedback, complete-item ZIP links, all 216 synthetic transcript turns and their download, missing-English-transcript wording, and Hide/Show Details. All APIs were intercepted; no live content or account writes were made. [Evidence](social-feed-browser-2026-10-29.json).
- **140 broader route/viewport checks passed:** public navigation, administrative workspace routes, guest account boundaries, chat translations, sidebar installation and registration-to-library entry. No runtime errors, unexpected APIs or invalid navigation links. [Evidence](experience-browser-2026-10-29.json).
- **37 focused regression tests passed**, covering discovery, media performance, navigation and experience reliability. Root TypeScript checking passed; lint passed with nine existing image-optimization warnings and no errors.
- Mobile TypeScript/Vite build passed. The final bundle was refreshed after presentation adjustments. Existing Tailwind module-type and large-chunk warnings remain.
- Website production build passed, including TypeScript validation, all 57 static pages and build traces.

## Previews

These screenshots use fictional media and intercepted API fixtures, not published cultural records.

- [Desktop Discover](screenshots/social-discovery-1440.png)
- [Phone Discover](screenshots/social-discovery-390.png)
- [Compact phone](screenshots/social-discovery-320.png)
- [Desktop collection](screenshots/social-collection-1440.png)
- [Phone collection](screenshots/social-collection-390.png)

Browser checks used Chrome. This is a local implementation and build audit; it does not represent a production deployment or an APK installation on a physical phone.

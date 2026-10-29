# Public media layouts and completed transcript verification

Reviewed locally on 29 October 2026 (Africa/Nairobi).

## Transcript continuation

Completed the read-only live-data audit of the previously implemented public reader. All 25 published oral-history conversations passed: all 2,675 approved transcript segments are available, with public-safe fields, and an unpublished conversation was denied. See `reader-live-2026-10-29.json`. No records were changed.

The full reader keeps natural conversation order and the permitted interviewer/respondent roles. A complete conversation can be read on the page before downloading it. The collection preview now starts collapsed and requests the conversation only when opened; full item details open the reader. Long conversations have a keyboard-accessible scrolling region instead of stretching the feed indefinitely. This changes presentation and loading behavior, not the returned transcript content.

The 25 live conversations have no uploaded English transcript. The interface explicitly reports this when English is selected and provides the original-language conversation. It does not mislabel Dholuo as English or invent a translation.

## Layout changes

- Discovery no longer reserves the right side of every screen for unrelated exploration links. Those links remain below the feed.
- On sufficiently wide content panels, each discovery/collection/detail card gives approximately three quarters of its width to media and one quarter to its own description and actions. Container queries respond to the actual available width when the sidebar opens or closes. Narrow panels stack the content.
- The desktop page uses the available width up to 1,600px. Images and video have bounded dimensions and preserve their aspect ratios.
- Discovery, collections and item dialogs share one media gallery. All attached images, video, audio and documents remain reachable; a video no longer hides an audio attachment. Pictures and video sit close together, with recordings and documents below on phones.
- Phone title and category share one row, followed by grouped Explore, Save, review status and download controls. Long titles retain their full accessible name and can be opened to read in full. Descriptions are short previews; item details retain full text.
- Collection transcript and file-download controls share a compact row. Original-file and text downloads remain in an expandable list, alongside the direct complete-item ZIP download. Native download origins remain intact.
- Item dialogs have centered placement and narrow-screen gutters, keeping the reader inside the viewport.
- Public cards use opaque white surfaces with consistent teal, soft green and amber accents, compact gutters and readable contrast.

## Verification

- Full regression: 397 tests passed, zero failures. See `public-layout-tests-2026-10-29.log`.
- Final focused regression after the last spacing refinements: 42 tests passed, zero failures. See `public-layout-final-targeted-2026-10-29.log`.
- Full interface browser audit: 140 route/viewport checks, no layout overflow or runtime exceptions. This includes public routes, staff sections and guest account boundaries. See `public-layout-full-browser-2026-10-29.log` and `experience-browser-2026-10-29.json`.
- Final focused Chrome audit: 18 combinations of discovery/collection, viewport and sidebar state, at 1,440px, 1,366px, 1,024px, 768px, 390px and 320px. It checked the desktop split, phone title/category row, grouped attachments, bounds and lack of horizontal overflow. At 1,440px, the measured split was 75/25 with either sidebar state. At 390px, the fixture metadata areas measured about 165px for discovery and 224px for collections. See `public-media-browser-2026-10-29.json` and `.log`.
- Browser interactions passed: one save request and saved feedback, all 216 fixture conversation turns, complete transcript text download, missing-English handling, dialog dismissal, video playback, and pausing a recording when another starts. No conversation was fetched while simply browsing the collapsed previews.
- Mobile production bundle passed, including TypeScript; the existing large-bundle warning remains.
- Web production build passed: compilation, type checking, 57 static pages and build tracing. Lint passed with eight existing image optimization warnings. See `public-layout-build-2026-10-29.log` and `public-layout-mobile-build-2026-10-29.log`.

Browser APIs and media were intercepted using fictional records, a labelled sample illustration, a generated test clip and silent test audio. These checks made no live account/content changes or AI requests. The separate transcript data audit used actual read-only database queries. No production deployment was performed.

Screenshots are in `screenshots/public-discovery-{1440,390,320}.png`, `screenshots/public-collection-{1440,390,320}.png` and `screenshots/public-transcript-mobile.png`. Reproduce the focused checks with `node scripts/verify-public-media-layout.cjs` against a local server using `SMOKE_BASE_URL`.

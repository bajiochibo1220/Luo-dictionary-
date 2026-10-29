# Public first impression

Implemented locally on 29 October 2026.

The public application opens directly into a scrollable cultural feed. Published stories, images, recordings, text records and dictionary entries appear before account prompts. The reader dashboard uses the same feed after sign-in. Teacher and researcher starting tools and staff routing remain available through their assigned destinations.

The initial public navigation has three primary links: Discover, Browse the library and Saved words & items. Collections and other tools remain in expandable sections. The public desktop sidebar starts collapsed for a new visitor and continues to respect a saved preference. Administrative sidebars retain their existing default behavior.

## Content and interactions

- The discovery API uses the existing public library projection and access rules. Only eligible published content and media are returned; internal identities and consent evidence remain private.
- Discovery works without the optional audio-visual module and includes text-only records. Each request is bounded to 12 cultural records and 6 structured dictionary entries, with separate continuation cursors.
- Available content areas take turns within each response. This is a simple browsing order; the interface makes no claims about popularity or personal recommendations.
- Search and category filtering happen on the server. Changing a selection cancels earlier requests and prevents late pagination responses from replacing the current selection.
- Audio and video use explicit playback controls. Existing media fallback behavior remains in use.
- Item details reuse the existing bilingual view and full-item downloads. Native downloads retain the API origin.
- Browsing is open to guests. Saving offers account creation for a guest and uses the existing saved-items API for a signed-in reader. Native reader sign-in now returns to discovery; assigned staff still enter the embedded staff workspace.
- New interface wording is registered in the translation editor; existing approved translations remain authoritative.

## Verification

- Full suite: 373 tests passed, including 12 new discovery tests covering public access, governance, category filters, pagination cancellation, guest saving, authenticated saving and role-aware reader dashboards.
- TypeScript checking passed. ESLint passed with the existing 13 warnings and no errors.
- Mobile production build passed (TypeScript and Vite).
- Web production build passed, including type checking, all 57 static pages and build traces.
- Headless Chrome layout checks passed at 1440px and 390px. The first content card begins about 345px from the top on mobile, and the document has no horizontal overflow. Mobile card-title areas measure 332px wide.

The preview and screenshots use fictional sample records and a clearly marked sample illustration. Production reads published records from the API. These layout checks do not constitute authenticated browser testing against the live database. No production deployment or live content changes were performed.

Reproduce the previews after a build with `node scripts/preview-discovery.cjs`, then use `node scripts/capture-organization-preview.cjs --discovery` on Windows with Chrome installed.

# CULTURAL HERITAGE and responsive experience audit

Implemented locally on 29 October 2026.

## Result

- Renamed the public chat, navigation, floating launcher, page metadata and help wording to **CULTURAL HERITAGE**. Suggestions cover Luo songs and marriage customs.
- Scoped every chat generation path (greetings, verified catalog, retrieved references and questions without library matches) to Luo cultural heritage and Dholuo. General Luo knowledge remains available beyond the stored collection. Unrelated requests receive a brief cultural-scope explanation.
- The model detects the actual question language. The selected interface/answer language is a fallback for ambiguous messages. English questions containing a quoted Dholuo word remain English questions.
- Each new answer includes the opposite-language translation, initially collapsed beneath the answer. Both versions persist in owned conversation history. Existing plain-text history stays readable; older messages are not retroactively translated.
- Provider JSON output is validated before display or persistence. Empty/incomplete versions, mismatched source markers and stray non-Latin scripts trigger one repair generation, followed by a safe error if still invalid. The existing ownership checks, external-AI consent, quotas and public-only retrieval remain in force.
- Public feed media keeps the desktop media/details split, uses larger natural-aspect displays, and gives phone visuals full-width rows. Images use their actual asset rather than only a thumbnail. Black backgrounds fill unused media space. Shared players also apply contain/black defaults to older collection/detail/admin views. Older cropped song/artifact/place previews were corrected.
- Full descriptions remain accessible through item details and in-place Read more controls. Song-card media controls no longer sit inside the navigation link.
- Installation is available in public and administrative sidebars. The root-level floating prompt was removed. A shared provider retains the browser installation event even before a sidebar is mounted; browsers without that event receive installation instructions.
- The root opens registration, which includes **Browse the public library**. Fresh anonymous mobile web launches at `/application` open registration; an explicit library hash opens guest discovery. Signed-in launches retain their account flow. The packaged app presents account creation/sign-in and explicit public browsing before opening its content area.

## Verification

- Full automated suite: **399 passed**, followed by **67 passing focused checks** after translation validation changes.
- Browser regression: **140 route/viewport checks**, no overflow findings, runtime errors, unexpected APIs or invalid navigation links. Tested both translation dropdown directions, sidebar installation, mobile registration-to-library navigation, consented chat submission and guest account boundaries. See [browser evidence](experience-browser-2026-10-29.json).
- Media browser audit: **18 layouts** at 1440, 1366, 1024, 768, 390 and 320 pixels, including expanded/collapsed desktop sidebars. Portrait/panoramic fitting, black backgrounds, native video controls, audio switching, save feedback, full 216-turn transcript display/download and English-transcript fallback passed. See [media evidence](public-media-browser-2026-10-29.json).
- Four real configured DeepSeek checks passed after translation validation was tightened: an English Luo-music question with a Dholuo fallback, a Dholuo question with an English fallback, an unrelated coding request, and a coding request disguised as a Luo request. These checks use read-only public retrieval and create no saved chats or database writes. See [live evidence](cultural-chat-live-2026-10-29.json).
- Mobile production build passed (`tsc --noEmit` and Vite). Existing Tailwind module-type and large-chunk warnings remain.
- Website production build passed, including TypeScript validation, all 57 static pages and build traces. Lint passed with nine image-optimization warnings and no errors.

## Limits

This changes instructions, response validation and application behavior; it does not train a new model. Automated checks establish the tested language/scope behavior, not universal resistance to every prompt or fluent translation accuracy. Historical claims, quotations and generated Dholuo still need fluent cultural review. Browser APIs and account behavior were exercised with intercepted synthetic data; no live registrations, deletions, publication changes or emails were made. Mobile build verification is not an on-device APK installation test.

## Technical sources checked

- [DeepSeek JSON output](https://api-docs.deepseek.com/guides/json_mode/): JSON response format, prompt example and completion limits.
- [Groq structured output](https://console.groq.com/docs/structured-outputs): JSON mode and application-side validation.
- [MDN object-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit): containing the entire image/video within its display area.
- [MDN beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event): retain the browser event and invoke installation from a user-selected control.

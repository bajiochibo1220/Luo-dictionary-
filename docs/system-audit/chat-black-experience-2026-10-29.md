# Black chatbot and reliability improvements

CULTURAL HERITAGE now uses a black conversation background, header and composer, with near-black message cards, settings, translation panels and history. Text, placeholders, source links, errors and focus indicators were adjusted for readable contrast. Native chat form controls use a dark colour scheme. These styles are scoped to the chatbot.

The empty conversation now starts at the top, so a short phone screen does not scroll past the introduction. Message scrolling respects reduced-motion preferences. Starting a valid new send or loading a saved chat clears stale notices, so a successful retry does not leave the previous failure banner visible.

Saved chat history decodes each message once instead of three times. Stored bilingual payloads use structural validation when read, so older answers remain readable after generation-validation rules tighten; new generated answers still pass the strict bilingual checks before being saved.

AI source markers are checked against the actual source list supplied to that generation, in both the answer and its translation. Unknown, zero, negative and malformed numbers trigger the existing single repair attempt, followed by a safe error if still invalid. Questions without supplied references cannot receive invented source markers. Retrieval and catalog responses retain valid source citations.

## Verification

- **56 focused tests passed:** chat generation, valid/invented source citations, translation validation, old-history compatibility, conversation ownership, chat recovery and provider handling.
- **Four browser widths passed:** 320, 390, 768 and 1440 pixels, with no horizontal overflow, a visible composer and an introduction starting at scroll position zero.
- **32 sampled text contrast checks passed:** the lowest measured ratio was 8.33:1, above the audit threshold of 4.5:1. Checked headings, descriptions, suggestions, input text, settings labels, messages, translations, source links and error/history text.
- Browser interactions passed for history failure/retry, sending messages, expanding translations and sources, readable provider errors, restoring the failed question and successful resend. All API responses were synthetic and intercepted; no live account/content writes or provider calls were made. [Browser evidence](chat-black-browser-2026-10-29.json).
- Lint passed with nine existing image-optimization warnings and no errors.
- Website production build passed, including TypeScript checking and all 57 static pages. Mobile production build passed (TypeScript and Vite). Existing image-optimization, module-type and mobile bundle-size warnings remain.

## Previews

- [Phone, empty chat](screenshots/chat-black-empty-390.png)
- [Desktop, empty chat](screenshots/chat-black-empty-1440.png)
- [Phone, messages and translations](screenshots/chat-black-messages-390.png)
- [Desktop, messages and translations](screenshots/chat-black-messages-1440.png)

Citation-number validation establishes that a referenced source is in the supplied list; it does not establish that every generated claim is supported by that source. Cultural facts and fluent Dholuo remain subject to review. Browser checks used Chrome; mobile build checks do not represent a physical-device installation test. Changes are local, without a production deployment.

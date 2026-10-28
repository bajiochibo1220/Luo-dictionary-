# Final system audit ? 28 October 2026

The audit combined source review, regression tests, live local-production browsing, read-only account checks, synthetic provider requests and temporary private media uploads. It does not certify every device, all possible content or production hosting performance.

## Corrections

- Admin final-review media now uses permission-checked application URLs instead of raw authenticated-storage addresses.
- The media manager identifies audio by content type, so audio stored under Cloudinary's video resource class opens in an audio player.
- Audio uses compressed MP3 previews with original-quality downloads. Public and admin players pause earlier playback when a new player starts. Audio failures expose a retry action. Audio/video conversion failure switches the player's entire source to an original-file URL so subsequent seek requests stay consistent.
- Native protected previews retain original file formats and stop oversized chunked responses before buffering the entire file. Changing the selected attachment clears the previous preview.
- Microphone startup prevents duplicate requests, releases a late-granted stream after navigation and reports empty or failed recordings. Saving is disabled while a microphone request is pending.
- Main admin record totals exclude separate public snapshots. Editors and publishers have a direct Content & early publishing sidebar entry. Admin page navigation resets the content scroller.
- AI text and media tools share stateless transport recovery. A failed Interactions request can use the standard generation API. Repeated Interactions failures receive a short cooldown. Thought parts and incomplete generations are excluded. Invalid credentials and exhausted quota remain errors.
- The validated default text model is gemini-3.6-flash. The illustration default is gemini-3.1-flash-image, replacing a model identifier absent from the provider's available-model list. Saved settings and environment values continue to override defaults.
- Web and mobile AI requests allow enough time for generation instead of timing out before the server's processing window.
- Tutor vocabulary includes current reviewed dictionary uploads as well as older dictionary entries. Answer keys stay server-side; withdrawn or replaced uploaded source versions invalidate existing attempts.
- New public media messages and updated role-guide wording are registered as editable English sources. Approved translations continue to control bilingual public rendering; admin pages remain English.
- The in-app role manuals and current Markdown user/admin guides were updated.

## Validation

| Area | Evidence |
|---|---|
| Regression | 312 regression tests passed with zero failures. Covers password/session revocation, publication, consent, source replacement, roles, navigation, learning, research, games, uploads, media and AI request handling. |
| Types and builds | Web production build and mobile web production build passed. Next.js type checking passed. Lint completed with zero errors and 12 existing nonfatal warnings. |
| Dependency checks | Zero reported production vulnerabilities in both root and mobile npm audits. Development dependencies were excluded. |
| Public/admin browsing | Real Chrome verified public, admin and super-admin sidebar collapse/persistence, mobile drawer focus trap, Escape/focus return, no horizontal overflow and navigation at 320/390px and desktop widths. The signed-in route suite and 16 guest public pages returned successful responses. Public entry opens the library without mandatory sign-in. |
| Account privacy | Two existing active accounts passed identity, no-store, web/native history API parity, rejected-bearer and anonymous-history checks. Their sampled history lists were empty; nonempty ownership/message cases are covered by regression fixtures. Existing accounts were unchanged. |
| Role scope | Master/Super Admin and language-administrator samples were exercised live. No active uploader, editor or publisher sample accounts existed; their navigation, task cards and language scope were verified with controlled-session regression tests. |
| Audio/video | A synthetic WAV uploaded privately, converted to MP3 and played in Chrome. A browser-generated WebM uploaded privately, converted to H.264 MP4 and played in Chrome. Seeking requests were accepted; initial freshly generated CDN responses may return a full 200 response before later range delivery. Remote synthetic clips were deleted. The configured repository contained images, but no stored audio/video records at audit start. |
| Media browser lifecycle | Chrome checked advancing playback time, one active player, 360px fit, accessible failure/retry, a consistent original-source fallback, previous-file cleanup and releasing a delayed microphone grant after leaving practice. |
| Final navigation and offline checks | Real admin client navigation reset the inner content scroller without a document reload. With synthetic API fixtures, Chrome verified offline lesson reload, queued attempts surviving restart and synchronizing once, contribution text and attachment bytes surviving offline restart, explicit draft deletion, and pinned library controls with accessible targets at 360px and 1440px. Both browser scripts exited successfully; logs are stored beside this report. |
| AI services | Live synthetic requests passed text, chat greeting, embeddings (768 dimensions), audio understanding and image understanding. Results/timings: services.json. |
| Tutor | Live conversation, translation, grammar, writing and story requests passed. A real database transaction created synthetic reviewed dictionary words, created a quiz, graded it at 100% and rolled back every write. Results: tutor.json. |

The standalone media checks use actual shared React components and native browser decoding. Microphone permission is simulated for lifecycle tests; no physical microphone or speaker was certified. Browser fixtures and synthetic source strings do not become published cultural records.

## Remaining external requirement

**The configured Google project returns HTTP 429 for image generation.** Application error handling is verified, but a completed illustration could not be validated with the current quota. An authorized administrator must restore image-generation quota/billing or configure a project with available image-generation capacity. Text-generation recovery does not replenish image quota. Repeated automatic retries are not a remedy.

## Scope limits

- Live tests ran against a separate local production server; remote DNS, HTTPS hosting, real email delivery, OAuth consent and physical Android/iOS devices were not certified.
- The mobile result is a web-client bundle, not a signed native store release.
- AI text/transcription tests establish working transport and output handling, not fluent-speaker accuracy certification. Generated cultural and linguistic material remains a draft requiring review.
- Media assistance retains its 8 MB source limit; personal practice transcription retains its 2 MB / one-minute recording limits. These limits are documented in the manuals.
- Initial media transformations, network speed and hosting/provider location can still affect latency. This was not a whole-site load benchmark.
- Existing nonfatal lint/build notices remain, including image-element advisories, some ref-cleanup advisories, module-type detection and mobile bundle-size warnings.

## Reproduce

Use Node.js 22 or newer. Pure regression: `node --test --test-isolation=none tests/*.test.cjs`.

For a local production server set `SMOKE_BASE_URL` to its origin and run `scripts/smoke-navigation.cjs --appearance`, `scripts/smoke-navigation.cjs` and `scripts/smoke-account-sharing.cjs`. `scripts/smoke-audio.cjs` uses only local synthetic fixtures. The provider round-trip scripts temporarily create and delete private synthetic assets. Live AI audit scripts use small synthetic prompts; they consume provider quota. The vocabulary audit deliberately rolls back its database transaction.

## Provider references

- [Cloudinary audio delivery and optimization](https://cloudinary.com/documentation/audio_transformations)
- [Gemini text generation](https://ai.google.dev/gemini-api/docs/text-generation)
- [Gemini audio understanding](https://ai.google.dev/gemini-api/docs/audio)
- [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation)

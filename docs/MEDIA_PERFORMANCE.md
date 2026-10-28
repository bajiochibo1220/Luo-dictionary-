# Public media performance — 28 October 2026



Public image delivery now requests bounded dimensions, automatic compression and browser-compatible modern formats through Cloudinary. Shared public image components offer 320/640/960/1280px responsive candidates, lazy loading and asynchronous decoding. Gallery thumbnails use a 640px candidate instead of the original. Video posters are generated as small JPEG frames.



Video previews are limited to 1280px wide and compressed as H.264 MP4. Offscreen public videos defer both source and poster loading until within 200px of the viewport; visible videos preload metadata for playback. The file endpoint streams provider responses and preserves byte ranges, partial responses and invalid-range responses, so seeking does not require downloading the entire file. Browser research/staff previews also stream directly through the governed endpoint; native bearer-token clients retain their authenticated blob transport.



Optimized media may be stored in the browser but must be revalidated on every reuse (`private, no-cache`). Current maintenance, consent, publication and authorization checks run before conditional requests. Provider ETags allow unchanged previews to return 304 without retransmitting their contents. Signed provider URLs stay on the server. Downloads retain the original file and use `private, no-store`.



Cloudinary generates and caches derivatives on demand. First access can take longer while a derivative is created. If image conversion fails, delivery falls back to the original. If audio/video conversion fails or is still processing, the player switches to an original-file URL for the whole playback session so later seek requests do not mix representations. Poster failures do not substitute a whole video as an image. Connection speed, hosting location and provider limits still affect delivery; adaptive bitrate streaming is not part of this change.



Validation:

- 284 regression tests passed, including six new tests covering responsive URLs, image negotiation/revalidation, withdrawn-access rejection before 304, video byte ranges, JPEG posters, unsupported sizes, original downloads, conversion fallback and invalid seeking.

- TypeScript passed; lint completed with no errors (existing warnings remain).

- Web and mobile web production builds passed.

- Live stored-image check: original 18,825 bytes; 640px automatic WebP preview 12,742 bytes, about 32% smaller. This small sample is not a whole-site speed benchmark.

- No stored video was available in the configured database; real video throughput could not be measured. Video transport behavior was tested with controlled upstream responses.



Deployment must include these source changes and a fresh production build for hosted visitors to receive them.



Provider references: https://cloudinary.com/documentation/image_optimization and https://cloudinary.com/documentation/video_optimization



Final audit extension: audio now uses a compressed MP3 preview with original-file downloads, public and admin media use shared error/retry controls, and starting another player pauses the previous one. A synthetic private WAV upload was converted to MP3 and a synthetic WebM video to H.264 MP4; both played in a real browser and both remote test files were deleted. See `docs/system-audit/final-2026-10-28/REVIEW.md` for audit scope and limits.

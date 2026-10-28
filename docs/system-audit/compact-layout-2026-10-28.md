# Compact content layout

Collection search and content-language controls use the masthead's available space at desktop widths of 1024px and above. On narrower screens they stay immediately above the collection title. The same toolbar supports the web dashboard, shared public application, packaged client and research collection search.

The media filter dock is 47px tall before device safe-area insets, retaining 44px touch targets. Duplicate bottom padding was removed, and chatbot placement follows the dock height. Images and videos use viewport-aware maximum heights with full-image containment. Media and descriptions use two columns only when the actual content area is wide enough; descriptions open in full and can be collapsed.

Verified in Chrome at 320, 360, 768, 1024 and 1440px: correct toolbar placement, raised desktop title, full synthetic portrait above the footer, fixed footer position, pinned collection controls, accessible filter widths and no horizontal page overflow. Screenshots are in screenshots/compact-library-{width}.png. The browser used synthetic collection/media responses, not real uploaded cultural records.

Validation: 17 navigation/library regression tests passed, root TypeScript checking passed, the final mobile web production build passed, and targeted lint completed with zero errors and two existing warnings. The Next.js development application compiled and served successfully. This turn did not rerun the full web production build or certify physical devices. Logs are stored alongside this report.

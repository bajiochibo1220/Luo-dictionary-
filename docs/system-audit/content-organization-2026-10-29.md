# Content organization and deletion

Implemented in the local checkout on 29 October 2026.

## Changes

- Content, Review & edit, Publishing Queue, Review History and Published History now use a common collection browser with search, language/status filters, grouped content areas and 25-item pages.
- Content-area links on the main Content page filter on the server, including categories outside the first batch. Additional batches remain reachable beyond the former 500-record limit. The shared mobile staff workspace can load additional batches beyond its former 100-record limit.
- Workflow status and public-version availability have separate badges. Content actions use a consistent grid; review cards keep titles, badges and actions readable at narrow widths.
- Review and publishing queues support individual deletion and selecting visible items for bulk deletion. Changing the visible collection clears the selection.
- Source uploads and publication snapshots no longer appear as duplicate items in the shared administrative list API. Published source records appear in the Published workflow stage.
- Public library category changes query the server before pagination. Search and continuation requests retain the category, and obsolete responses cannot overwrite a newly opened collection. Category options come from the available public module catalog.
- The public library API preserves the provisional-publication indicator so readers can distinguish content published before review.

## Deletion behavior

Unpublished deletion retains existing assigned-editor and uploader permissions. Removing an upload with a public version requires a Master Super Admin or an assigned language administrator and an explicit public-removal confirmation. The server checks every record independently.

The source upload and its public snapshot are archived together with translations, file metadata, transcripts, provenance, consent records, versions and review history. Archiving and removal run in one database transaction; an error rolls back the batch. The public snapshot is removed before the source to respect the database relationship. Shared file bytes are retained in storage.

## Verification

- Full suite: 361 tests passed. Windows PowerShell wrapped an expected authentication-test diagnostic as a native stderr message; the Node test summary reports zero failures.
- Additional focused run after the collection/pagination changes: 43 tests passed.
- Additional focused run after responsive styling changes: 23 tests passed.
- TypeScript checking passed; ESLint passed with warnings about image tags and effect cleanup.
- Next.js production build passed, including the final responsive refinements and static-page generation.
- Mobile production bundle passed (TypeScript and Vite).
- Headless Chrome checked actual components rendered with fictional data at 1440px and 390px. Both layouts had no document overflow; mobile review-title areas measured 295px wide.

The local previews and screenshots are beside this report. They contain fictional records and do not establish authenticated browser behavior against the live database. No production deployment or live deletion was performed.

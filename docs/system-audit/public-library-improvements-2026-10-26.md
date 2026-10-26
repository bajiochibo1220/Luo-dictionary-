# Public cultural library improvements — 26 October 2026

This change follows the public cultural-preservation purpose of the PRD and the local JOOUST/NRF Phase 1 funding specification. Existing consent restrictions, provenance, checksums and repository identifiers remain part of publication and media access. This is implementation evidence, not formal acceptance of every PRD requirement.

## Public use and mobile layout

- The home page opens `/application` without requiring registration. Accounts are used for contributions, saved items and personal progress.
- Community selection excludes English. The collection language switch displays the English version of the same community record, including its translated title and full text. English is still stored as the translation language.
- Search, content language, contribution action, media filters and view switch share one compact sticky toolbar inside the content scroller. Filters stay on one row. Empty states no longer repeat the contribution action or occupy most of the screen.
- Administrative content uploads use one compact New upload menu instead of a long sticky list of buttons.
- Cards show readable previews and clearly separated actions. Images and videos use containment rather than cropping. The floating chat shortcut no longer pulses.
- Classroom controls and “My classes” were removed from the shared learning interface. Self-paced pathways, lessons, games and calendars remain. Legacy classroom routes open learning; historical classroom data was preserved.
- Profile and session controls are grouped in Settings.
- Public media has explicit download links through the same access-checked file endpoint. Text/transcript exports include the selected language version.

## Editor workflow and history

- Cultural reviewer assignments were merged into `content_editor`, including role checks, assignment options and notifications. Existing assignments were preserved and audited by migration `20261026160000_merge_editor_review`.
- Editors start review, edit the original and paired English version, complete the checklist and send the package to the publishing queue. An editor still cannot approve their own contribution. Publishing remains an assigned responsibility of publishers or language administrators.
- The shared translation form now uses the API's language field correctly. Missing paired English translations can be created while editing.
- Assigned editors can delete incorrect unpublished uploads. Row locking, permission checks, complete historical snapshot creation and deletion happen in one transaction. Published records cannot be deleted through this action. A failed archive prevents deletion.
- The uploader can see retained deletion history, the deleting staff member and the time. The audit archive preserves the original record, translations, media metadata, versions, reviews, transcripts, provenance and consent records.
- A database trigger rejects audit-log updates and deletions. Account erasure may clear the user reference while leaving historical payloads intact. As with any database protection, privileged database recovery is outside ordinary application operations.

## Institutional branding

Upload approved logos and choose official colours at **Super Admin → System → General → Institution logos & colours**, or **Staff workspace → System**. Uploads accept PNG, JPEG and WebP up to 2 MB and use configured Cloudinary storage.

Compact JOOUST and NRF marks appear in public and staff headers. Configured colours are used in the app mastheads and partner accents. Until approved files and colour values are supplied, the interface shows the partner names and existing heritage colours; it does not invent official logos.

## Verification

- Automated suite: [183 tests passed](public-library-tests-2026-10-26.log) using Node's single-process test mode. Default process isolation is restricted by this execution environment.
- TypeScript: passed. Production build: passed, including route generation. [The final source build log](public-library-build-2026-10-26.log) is retained alongside this report.
- Browser layout: real shared collection component and real web-application, packaged-application, public-dashboard, language-admin and super-admin headers, with fixture records and compiled project CSS, checked in local headless Chrome at 320, 360, 390, 768 and 1440 pixels. At every width the toolbar retained its position after 600 pixels of scrolling, filter buttons stayed on one row, and the page had no horizontal overflow. Mobile toolbar height was 181–196 pixels.
- Browser evidence: [measurements](public-library-layout-2026-10-26.json), [phone screenshot](screenshots/web-application-360-2026-10-26.png), [desktop screenshot](screenshots/public-library-1440-2026-10-26.png).
- Database: a private database backup completed before migration deployment. Migration deployment succeeded. Live rollback-only probes verified that legacy reviewer roles are absent and audit updates/deletions are rejected: [verification](editor-migration-verification-2026-10-26.log).

The browser measurements use fixture content; they do not claim a physical-phone test or a completed real-file upload/download acceptance test. Actual institutional logo files and approved colour values still need to be supplied. Existing project-wide readiness gaps in `SYSTEM_IMPLEMENTATION_STATUS.md` remain subject to their own acceptance work.

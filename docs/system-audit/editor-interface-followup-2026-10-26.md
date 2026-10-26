# Editorial workflow, interface language and registration follow-up

This update consolidates editorial work and adds editable interface language pairs. It follows the mobile layout report and supersedes its description of the registration background and language controls.

## Workflow and access

- Review & edit contains new submissions, unfinished edits, legacy unvalidated reviews and rejection-review items. The separate editor queue menu is removed; saved `/admin/editor-queue` links redirect to the unified queue.
- Editors no longer receive the Content & files link that redirected them away. Editorial tasks and interface editing are shown for their assigned duties. The shared workspace scopes management tabs to the selected community; uploader accounts no longer receive an AI administration tab.
- Bulk deletion is available in the review queue, content list and shared staff workspace. A batch contains at most 100 distinct unpublished records. Selection, deletion confirmation and preserved history are visible. The database transaction locks rows in sorted order, archives content and linked history with the actor's identity, then deletes. A failure or published item aborts the whole batch. An oversight-only Super Admin cannot use deletion to bypass editorial assignments.
- Community-language and English forms appear together during editorial editing, alongside separate save controls. Saving keeps the paired editor open. The review page offers its editing action near the top, and only enables approval after the checklist is complete. Existing English-completeness, consent, independent review and publishing checks remain enforced by the APIs.
- Private attachments on review pages use the permission-checked media endpoint.

## Layout and institutional identity

- Generic workspace headings scroll normally instead of sticking over cards, tables and forms. Compact library search controls remain sticky and media controls remain at the bottom.
- The existing uploaded JOOUST logo fills a viewport-sized registration/sign-in background using `background-size: cover`. No blur filter is applied. A light colour overlay and opaque form card preserve readability; the source image's resolution still limits enlargement quality.
- The uploaded JOOUST and NRF marks remain together above authentication fields and in grouped page footers. Branding does not overlay repository content.

## Interface language editing

Open **Edit system text** in the assigned editorial/language-admin workspace. Search for a heading, button, message, collection title or contribution-field label, edit the community-language and English fields side by side, and save. The packaged/shared workspace offers the same text editor. Existing collection metadata supplies initial translations; only explicit overrides are saved, so untouched labels continue to follow metadata updates.

- Text pairs are saved per community, including that community's English wording. English is not registered as a cultural collection.
- A persistent interface-language selector is available before registration/sign-in and in public/staff mastheads. Library version switching updates that setting. React translation boundaries update authored UI text and translated input attributes without rewriting form values, cultural records, transcripts, API identifiers or user conversations.
- Future active communities receive independent catalogs and English pairs. Editors can write only catalogs for communities where they hold an editorial or language-administrator assignment; the Master Super Admin can edit all. Interface changes and before/after values are stored with the actor in the same transaction as the settings update.
- `npm run i18n:catalog` maintains the authored JSX text catalog. New dynamic interface strings still need an explicit registered source and translation boundary.

**Language readiness is incomplete.** The production-server smoke test returned 1,413 catalog entries, of which 228 have Dholuo values and 1,185 remain empty. The catalog includes seeded Dholuo labels for registration and common controls, but many longer/help/administrative strings still have empty community-language values. The editor displays missing counts and a missing-only filter. Empty values retain readable English. Seed wording also needs fluent-speaker review. This infrastructure is not evidence of complete or certified Dholuo localization.

## Verification and acceptance limits

- Automated suite: 200 tests passed, including scoped sidebar/task access, community-specific English pairs, database-defined field labels, catalog write authorization, atomic audit failures, consolidated queue scope and batch-deletion protection.
- TypeScript passes. The [production build](editor-interface-build-2026-10-26.log) and [mobile web-client build](editor-interface-mobile-build-2026-10-26.log) both completed successfully. Lint has no errors; image/hook warnings remain.
- The hydrated browser harness uses fixture accounts/content and the real saved public logos. It checks compact controls and account menus at five widths, scrolling headings and bulk selection at three widths, and language switching/form-value retention on phone and desktop authentication forms. Interface-edit writes in this harness modify an in-memory fixture, not the database.
- A production-server [endpoint smoke test](interface-endpoint-verification-2026-10-26.json) loads real public branding and interface metadata, rejects English as a community, denies anonymous catalog writes and redirects anonymous dashboard access to sign-in. It performs no database writes.

Evidence: [200 tests](editor-interface-tests-2026-10-26.log), [TypeScript](editor-interface-typecheck-2026-10-26.log), [browser measurements](editor-interface-verification.json), [browser log](editor-interface-browser-2026-10-26.log), [authored-text readiness](interface-language-readiness-2026-10-26.json), [phone registration](screenshots/editor-dholuo-register-360.png), [desktop registration](screenshots/editor-dholuo-register-1440.png), [editor queue](screenshots/editor-review-390.png).

These changes retain the NRF annex's consent, restriction and audit controls (IAM-01/02/04, FUN-11), and the PRD's multi-language expansion direction. They do not complete infrastructure, acceptance evidence, full translation, physical-device verification or other outstanding requirements. Existing estimated coverage and formal acceptance totals are unchanged. Deployment is separate from local verification.

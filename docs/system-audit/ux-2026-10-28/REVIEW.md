# Account controls, public language and chatbot review

Reviewed 28 October 2026, Africa/Nairobi.

## Delivered behavior

- Master Super Admin: create staff accounts; manage names, emails, assigned duties, status and Super Admin access; change created accounts' passwords and the Master's own password.
- New passwords use 12–128 characters and bcrypt with 12 rounds. Self-changes verify the current password when one exists. Changes invalidate existing browser sessions, native sessions, refresh grants and password-reset credentials. Audit entries omit passwords and hashes. Master ownership cannot be revoked through these controls.
- Public interface text starts in English. Bundled and metadata translations are not treated as approval. Only saved interface translations show the community language with a smaller English meaning below. Missing translations stay English. Native select options and accessible attributes include both meanings inline where two-line markup is unsupported.
- Admin pages, administrator login, staff workspaces and administrator guides remain English. Content-language selection operates independently of navigation text. Original cultural contributions are preserved rather than automatically translated.
- Interface wording has one approval editor. Older Translations bookmarks redirect to Edit system text; the duplicate menu entry was removed so editing a seeded metadata label cannot be mistaken for approving a public interface translation.
- Chat history starts closed. Settings, citations and media expand on demand. X closes chat; Escape closes a menu/history first. Failed questions return to the input for retry. Earlier-message pagination preserves scroll position. Teal, cream and white surfaces replace the crowded brown chat layout.
- Current role-specific in-app manuals and the PRD user/admin guides explain password changes, translations, early publication and the revised chatbot.

## Verification

- Full regression run on the updated dependencies: 274 tests passed. The expanded focused account/password/language suite also checks bounded oversized-input rejection, SDK factory compatibility and the old translation bookmark redirect.
- Type checking passed. Lint reported no errors; existing image and effect-cleanup warnings remain.
- The shared mobile production build passed, including the updated staff password control. This checks the web bundle used by the mobile shells; it does not replace device testing or an iOS/Android store build.
- The production web build compiled, type-checked and generated its static/dynamic routes successfully.
- Real AI-provider requests passed for a greeting, a dictionary definition and artifact-media discovery. The successful configured fallback was `gemini-3.6-flash`. A media request with no eligible matching videos correctly returned zero media rather than fabricated files.
- Browser checks passed for English defaults, saved bilingual labels, smaller English helpers and the actual English administrator login route.
- Browser account-control checks used fixture responses to verify mismatched-password rejection, submit behavior, current-password submission and sign-in-again navigation.
- Browser chat checks passed for history loading, consent before sending, answers, collapsed citations, provider-failure retry, mobile sizing and X navigation. No browser runtime errors were recorded.
- Database-backed creation, role assignment, password hashing, self-change, session/recovery revocation and audit checks passed. Disposable accounts stayed inside a transaction which was rolled back. Authorization was isolated for a test actor because the database correctly enforces a singleton Master. The production Master account and all real passwords were untouched.
- Temporary browser fixture routes and preview-build files were removed after verification.

Screenshots show fixture content, not private conversations: [desktop](chat-desktop.png), [mobile](chat-mobile.png). The Next.js development indicator is not part of the production interface.

## Dependency remediation

The review identified a [Zod constrained-collection memory-exhaustion advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Web/backend and mobile now use Zod 4.6.7. Record schemas, custom validation errors and error consumers were migrated to the new API. A regression verifies that an oversized constrained array returns one validation issue rather than allocating an issue for every invalid element.

The optional server OpenAI SDK was updated to 7.45.1 for compatible Zod support. Its existing client factory was checked without making a provider request. Its server-side constructor and runtime requirements were checked against the [official TypeScript SDK reference](https://developers.openai.com/api/reference/typescript). Node.js 22+ is now declared in the root package and README; checks ran on Node.js 24. No model, provider credential or live OpenAI API configuration was changed.

Fresh production dependency audits returned **zero findings** for both the web/backend and mobile projects. The mobile development-toolchain install still reported three moderate development-only advisories; these are excluded from the production dependency result. Dependency audits and passing checks do not certify every possible operation or future deployment.

AI availability still depends on external provider configuration, model availability, quotas and the network. No private corpus was submitted during the checks.

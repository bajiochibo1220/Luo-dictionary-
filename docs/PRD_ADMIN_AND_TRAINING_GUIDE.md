# Administration and training

Updated 30 October 2026.

## Master account and administrator passwords

Open **Admins → Add Admin**, enter the name, email and a password of 12–128 characters, and choose the role and communities. **Manage account** opens name, email and assigned duties. The administrators table also controls activation, Super Admin access and revocation.

The Master Super Admin can use **Change password** for a created account and **Change my password** for their own account. Enter and confirm the new password. A self-change also requires the current password if the account already has one. Saving invalidates existing web/mobile sessions and password-reset credentials. A self-change signs the Master out; sign in again using the new password. Audits record who changed which account without storing passwords. The Master cannot deactivate or revoke their own ownership account.

## Public translations and the English admin workspace

Administrative interfaces remain English. In **Edit system text**, select the community, find a label, enter the approved Dholuo text and retain its English meaning, then save. Only saved translations affect public controls. Public labels begin in English; after translation they show Dholuo above smaller English. Blank translations restore English. Use the inline preview and open the public interface to check login, sign out, menus, settings and help. The public community preference is selected at registration; sidebar and masthead selectors are removed. Administrative target-language controls remain available for editing assigned content.

## Publish while review continues

An assigned editor, publisher or administrator can use **Publish before review** from Content or an item's review page, including their own uploads. Content also supports **Publish selected before review**. Choose **Publish now** to release the uploads and attachments without separate consent, source-permission, access or embargo edits. The public package is separate from the source being edited.

Continue the normal review and paired editing workflow. Final publication replaces the public package at the same link, including its text, translations and eligible files. Rejection or removal of public/source permission withdraws the early public version. Sources with an existing public package cannot be deleted through ordinary queue deletion.

## Chatbot checks

History starts closed, and sources, media and settings expand on demand. **X** closes the assistant; Escape closes an open menu or history before closing chat. Check a question with explicit AI-processing consent, a saved conversation, an unavailable-provider response and the mobile layout. Provider availability depends on the configured key, model and quota; do not expose provider credentials in screenshots or manuals.

Read [the PRD tracker](../PRD_IMPLEMENTATION_TRACKER.md) for acceptance boundaries. This guide supersedes older training wording that separates cultural reviewers from content editors.

## Assign only necessary access

Master and super administrators manage platform settings. Language administrators manage their assigned communities. Uploaders contribute; content editors review and edit; publishers perform publication. Researcher and teacher assignments grant their consent-specific reading capabilities. Public interests, ages and institutional affiliations do not grant privileges. Review is an editor duty; do not recreate a separate cultural-review administrator.

After assigning a role, test using that account. Master and super administrators should land in the super-admin workspace; assigned curation staff in their workspace; public accounts in the public application. Explicit public browsing remains available. Never infer API authorization from a hidden navigation link.

## Contribute, review and publish

1. Choose the correct community and collection. Enter source-language and paired English content. Select the relevant subject from the 27 PRD inventory areas.
2. Supply rights, attribution and governance metadata. Pending or restricted material is not public. Research documents require a document type, abstract and permitted reuse information; datasets and models should include documentation and limitations.
3. Upload files and submit for review. Use original recordings and approved transcripts. Keep personal identifiers, raw GPS and private field notes out of public prose.
4. In Review & edit, correct both language versions, inspect attachments and verify permission. Related-record links must refer to appropriate public records. A public map marker needs separate approval and public coordinates; it does not expose the raw recorded coordinates.
5. Send the reviewed record for publication. Publisher approval makes eligible material visible. Recheck the public view and download links. Wrong content can be deleted individually or by the authorized bulk operation; audit/history remains for transparency.

## Learning and engagement content

Create level and skill resources using reviewed material. Choose a game mode, enter meaningful questions, choices and explanations, then review and publish. Artifact identification requires eligible reviewed images. Memory games reveal pair labels by design. Other graded activities keep answer keys server-side. Publish at least four distinct dictionary translations to enable tutor vocabulary practice. Do not fill collections with invented material for demonstration.

## Interface and branding

Use the interface editor to maintain community-language wording beside English. Save small batches, select the target language and test registration, navigation, forms, errors and public content on a phone and desktop. Blank translations deliberately fall back to English. Fluent human review is required before claiming a fully translated interface.

Use System > General > Background & appearance to upload the approved JOOUST background. The logo appears only behind the interface and retains its proportions without blur. NRF logo strips and uploads have been removed at the owner's request. Existing NRF research metadata and repository paths retain their technical meaning.

Help & training opens the guide for the account's assigned duties. Public accounts receive the public library manual; multi-role staff receive only the guides for their assignments. Ordinary Super Admins are not shown the Master-only Backup destination.

## AI and operational checks

Configure provider credentials and text/image model names in the protected system settings. Only public, published eligible repository context is sent to assistance tools. Personal tutor submissions have separate consent. Generated material stays a draft until independently reviewed. Test provider failures, quotas and unavailable browser speech controls.

Run maintenance only when needed. Save its switch and test a separate signed-out browser and a non-administrator account. Review analytics, immutable audit records, backups and restore instructions regularly. Do not claim security certification or NRF acceptance from a successful build.

## Training exercise

Use a non-production environment with clearly labelled fixtures: create a contribution, edit both versions, reject an unsuitable file, approve a correct record, publish, verify a public download, withdraw the record and confirm it disappears from search and AI source selection. Test an unassigned account against each privileged route. Complete one learning activity, two-player game, consented tutor request and a backup restoration rehearsal. Record participant feedback and remediation; production cultural approval requires the responsible people.

## Publish multiple uploads together

Open **Admin ? Content**. Tick individual rows, use the header checkbox (up to 100 visible items), or use **Select reviewed items ready to publish** / **Select items for publishing before review**.

- Choose **Publish selected** for culturally reviewed items awaiting final publication.
- Choose **Publish selected before review** to release eligible uploads while their review continues. The batch is one transaction: if any item fails a permission, consent, source-permission or stage check, none of the selected items is published. Correct the reported item or deselect it, then retry.
- Batches can include different content areas and languages when you have the required publishing permission for every item. Final publication still requires completed review and the English version where applicable.
- Use **Clear selection** to start again. Existing public versions cannot be published early again; publish their reviewed source to replace them automatically.

Master administrators can see the selection controls even without separate language-role assignments. An independent authorized person must publish each upload; users cannot publish their own contributions.

### Approve public sharing while content review continues

Use **Publish before review**, or select up to 100 uploads and choose **Publish selected before review**. In the dialog, choose **Publish now**. There is no permission checkbox. This explicitly overrides existing access restrictions and embargoes on the selected uploads and their attachments, including transcripts.

This works for every content area. It records the publishing staff member and previous record/attachment access settings, then sets public access and clears embargoes inside the same publication transaction. Existing source-permission evidence is preserved; this action does not create a rights-holder consent record. Content already in review stays in review. The reviewed publication replaces the earlier snapshot at the same public link. Role and language authorization, valid upload stages and a nonempty title still apply. A batch is rolled back if any selected item fails.

Continue editing and reviewing the source. Final publication replaces its earlier public version at the same public link.

## Final system audit: media and AI operation

AI configuration: this installation uses the selected DeepSeek or Groq provider for chat, tutor conversation, translation, grammar and writing feedback, story drafts, summaries, entity extraction, OCR and image descriptions. Open **Super Admin > System > API Credentials**, enter the DeepSeek API key, save, then select **Test AI connection**. The default model is `deepseek-flash`. `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` environment variables override saved settings. API billing and rate limits apply. The server reports authentication, balance and service errors without exposing credentials. There is no Gemini fallback.

Editors and publishers can open **Content & early publishing** directly from their sidebar. Main dashboard record totals count source uploads once, excluding their public snapshots. Navigation between admin pages returns the content scroller to the top.

Media review uses access-checked application links. Audio previews use a compatible compressed format while downloads preserve originals. The media manager identifies audio by its content type, even when storage classifies it as a video resource. A failed converted audio/video preview switches to an original-file URL consistently, preserving seeking. Device previews enforce their size limit while receiving the response.

Retrieval uses eligible public records, dictionary entries and transcripts through database text search. No Google key, embedding generation or index rebuild is needed. Existing Gemini credentials are retained in storage but are not used by the application. Image understanding accepts JPEG, PNG, GIF and WebP sources below 8 MB.

AI media sources must be explicitly public; results remain drafts. DeepSeek does not provide the audio transcription or image generation endpoints needed by the former tools, so those options are disabled and direct requests receive a clear unavailable response before files are sent externally. Recording, playback, downloads and browser dictation remain available where the browser supports them. Physical microphone, speaker and native-device behavior must be checked on deployment devices.

Vocabulary practice uses reviewed, published words from both current dictionary uploads and the older dictionary collection. At least four distinct English meanings are needed for a quiz. A replaced or withdrawn uploaded source invalidates an existing quiz; start a new attempt to use the current reviewed version. Unreviewed public snapshots are excluded from vocabulary grading.

Complete public downloads use the current published record, its available translations, permitted transcripts and original permitted attachments. They work for items published before review and show that review is in progress. Downloads always read the current public version. Operational identities, consent evidence, private collection coordinates and unknown internal JSON fields are excluded. The archive streams in ZIP64 format without buffering original media in server memory. An attachment failure fails the download rather than reporting a complete ZIP with missing files. Cancelling stops upstream transfers. Hosting request-duration and bandwidth limits still apply; individual original-file downloads remain available for large items.

AI provider alternative: select **Groq** under **System > API Credentials**, enter a complete Groq key from https://console.groq.com/keys, save, and select **Test AI connection**. Groq has a free tier subject to provider limits; it uses a different key from DeepSeek. Default text model: `openai/gpt-oss-20b`; image understanding: `qwen/qwen3.8-27b` (availability may change). Saved provider selection takes priority over `AI_TEXT_PROVIDER`, and provider selection is refreshed for every request to avoid stale choices across server instances. Usable provider-specific environment credentials and models still take precedence over their saved equivalents. Groq and DeepSeek use the same governed public retrieval and source checks. The application does not silently switch providers or reuse one provider's key for another. Audio transcription and illustration generation remain disabled in this integration. Deploy the updated server and web client before selecting the new option.

## Current navigation, recovery and policies

The public Explore list is a scrollable dialog with Back and X. Item details keep those controls visible during scrolling. Header Back controls are available in public, admin and packaged-client views. Verify the full list on a narrow phone and landscape screen, keyboard Escape and focus return to the Explore trigger.

Collection search stays pinned; media filters stay in the small fixed black bottom bar. Public cards use contained media, compact more/less descriptions and automatic next-page loading. Contribute appears within each collection and preserves its selected form through sign-in. Keep public descriptions, usage, place, English meanings, attachments and related items accurate. A missing media type is not a playback failure when no file of that type is published.

Login is the first entry screen. Test Forgot password as a reset-only sequence: email, then code and matching new passwords. Configure EMAIL_PROVIDER (resend or sendgrid), EMAIL_FROM (verified sender) and EMAIL_API_KEY in the local environment, or the equivalent email settings, before expecting delivery. Never put credentials in manuals or screenshots. The project's local delivery configuration remains deferred by the owner; do not report live email delivery as tested.

The Master Super Admin edits Terms and Privacy under System. Current implementation notices supplement saved institutional text and are included in the same text fingerprinted during registration. Existing consent evidence is retained. Fill all institution/contact/provider/retention/transfer fields using the actual deployment, and obtain the institution's legal review. Preview both public pages and new registration after changes. Do not overwrite earlier consent evidence or claim that existing accounts accepted a newly revised notice.

Install app remains the first sidebar action. Browser installation depends on eligibility and platform support; iPhone Safari requires Share, then Add to Home Screen. A successful web build or Android APK does not establish physical iOS acceptance.

# Administration and training

Updated 28 October 2026.

## Master account and administrator passwords

Open **Admins → Add Admin**, enter the name, email and a password of 12–128 characters, and choose the role and communities. **Manage account** opens name, email and assigned duties. The administrators table also controls activation, Super Admin access and revocation.

The Master Super Admin can use **Change password** for a created account and **Change my password** for their own account. Enter and confirm the new password. A self-change also requires the current password if the account already has one. Saving invalidates existing web/mobile sessions and password-reset credentials. A self-change signs the Master out; sign in again using the new password. Audits record who changed which account without storing passwords. The Master cannot deactivate or revoke their own ownership account.

## Public translations and the English admin workspace

Administrative interfaces remain English. In **Edit system text**, select the community, find a label, enter the approved Dholuo text and retain its English meaning, then save. Only saved translations affect public controls. Public labels begin in English; after translation they show Dholuo above smaller English. Blank translations restore English. Use the inline preview and open the public interface to check login, sign out, menus, settings and help. Content-language switches do not change interface labels.

## Publish while review continues

An independent assigned editor, publisher or administrator can use **Publish before review** from Content or an item's review page. Content also supports **Publish selected before review**. Public consent, public restrictions, source permission and embargo checks remain in force. The public package is separate from the source being edited; restricted attachments are excluded from an early release.

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

Use **Publish before review**, or select up to 100 uploads and choose **Publish selected before review**. In the dialog, tick **I have confirmed that the source or rights holder permits public sharing of every selected item and its ordinary attachments**, then choose **Approve sharing and publish**. Confirm this only when the source or rights holder has authorized public sharing.

This works for every content area. It records an audited permission confirmation and changes pending consent/internal access to public sharing inside the same publication transaction. Content already in review stays in review; it does not need to be returned for content editing merely to approve public sharing. Ordinary pending attachments are included. Restricted attachments stay private. Explicit non-public consent, denied source permission and active embargoes must be resolved separately. A batch is rolled back if any selected item fails.

Continue editing and reviewing the source. Final publication replaces its earlier public version at the same public link.

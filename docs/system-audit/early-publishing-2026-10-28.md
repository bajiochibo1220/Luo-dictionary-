# Easier publishing before review

Authorized editors, publishers and administrators can select **Publish before review**, then **Publish now**. The same dialog supports up to 100 selected uploads. The previous rights-holder checkbox and requirement to separately edit access settings have been removed from this flow.

This action sets public access and removes embargoes for the selected uploads, media and transcripts. It records the staff member and previous access settings in the audit log. Existing source-permission evidence remains unchanged; staff publication is recorded separately from rights-holder consent. Staff with publishing permission can also release their own uploads.

The original stays in its review workflow. Ordinary edits keep the public snapshot available. Final reviewed publishing replaces the existing snapshot at the same public ID, including through bulk final publishing. Changing source-permission evidence invalidates the earlier staff decision; setting access back to private withdraws the public snapshot.

Authentication, publishing roles, language scope, nonempty titles, valid workflow stages, batch transaction rollback and duplicate-publication protection remain enforced.

Validation: all 317 regression tests passed, including direct single/bulk publication, restrictions and embargo overrides, attachment inclusion, role and language boundaries, transaction rollback, the checkbox-free dialog, source-permission preservation and reviewed replacement. The production build passed, including type checking and all 56 static pages. Full lint completed with zero errors and 12 existing nonfatal warnings. Logs: early-publishing-regression.log and early-publishing-build.log. No existing cultural record was published or changed during verification.

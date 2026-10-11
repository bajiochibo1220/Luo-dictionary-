# Backup and recovery

Database snapshots include all public schema tables, account credentials and system secrets. Keep snapshots and media folders in private durable storage. Never place them under `public`, commit them, or share them as content exports. Configure `BACKUP_DIRECTORY` for deployments with ephemeral disks.

`npm run db:backup` creates a consistent database snapshot with a SHA-256 checksum. The master administrator can also create and download snapshots from the Backup screen. Database snapshots contain media metadata, not file bytes.

`npm run media:backup` creates a matching database snapshot, downloads original Cloudinary files, and writes a checksum manifest. Keep the media folder, manifest, and named matching database snapshot together. A folder without a completed manifest is incomplete. Unsupported external providers require separate backups.

## Recover into a separate environment

1. Configure a **new empty recovery database**, a recovery storage account, and private backup storage. Apply the exact migrations from the snapshot's application version. Do not reset an existing database.
2. Validate without changes: `npm run db:restore -- /private/backup.json --sha256=ORIGINAL_CHECKSUM`.
3. Restore with the original trusted checksum: `npm run db:restore -- /private/backup.json --apply --sha256=ORIGINAL_CHECKSUM`. The command refuses nonempty targets and mismatched tables or migration history. Table restoration runs in one transaction, preserving foreign-key order and PostgreSQL integer precision.
4. The snapshot restores saved provider credentials. Set recovery Cloudinary credentials in System Settings before restoring media; saved settings take priority over environment values.
5. Validate media with `npm run media:restore -- /private/media-folder`, then restore with `npm run media:restore -- /private/media-folder --apply`. Matching database identifiers and local/remote checksums are required. Existing provider objects are preserved; a different existing file causes an error instead of an overwrite. Media restoration is resumable and updates verified files individually because provider operations cannot share the database transaction.
6. In the isolated recovery environment, verify sign-in, administrator/public navigation, published media, blocked private media, and representative AI retrieval before switching deployment configuration.

Recovery validation has automated coverage. A full disaster-recovery rehearsal against a separate database and storage account remains an operational acceptance check; these commands were not run against live data during repairs.

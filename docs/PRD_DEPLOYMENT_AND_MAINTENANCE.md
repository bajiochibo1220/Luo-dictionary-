# Deployment and maintenance

## Before release

Use the approved environment and current lockfile. Never commit `.env`, database exports, credentials, private media or signing material. Confirm PostgreSQL, Cloudinary, authentication origins and AI settings. Validate native API origins and CORS allowlists separately from a local browser build.

1. Create a restricted database snapshot with the existing backup script and retain it in approved storage. Confirm restore procedures in an isolated database.
2. Review pending migrations and run `npx prisma migrate deploy` against the intended database, followed by `npx prisma generate` for application code. The PRD additions create `game_rooms` and `game_players` and add collection field definitions; they do not populate cultural collections. Do not use `db push` as a substitute for migration review.
3. Run `npm run typecheck`, `npm run lint`, `node --test --test-isolation=none tests/*.test.cjs` and `npm run build` from the root. Build the packaged UI using `npm run build` in `clients/mobile`. Check logs and return codes; successful compilation alone is not a successful release.
4. Deploy through the owner's normal process. Test authentication, role destinations, maintenance off/on, paired language editing/publication, protected downloads, translations, AI provider errors and the new PRD journeys.
5. Build/sign Android using the established native project. iOS compilation and signing require the Apple toolchain and credentials. Google Play and Apple review/verification are separate external milestones, not evidence supplied by a web build.

## Maintenance routine

Review provider quotas/costs, error logs and failed jobs. Run and verify backups regularly; rehearse restoration without overwriting production. Apply dependency/security updates with regression checks. Monitor revoked content to ensure public/AI/download paths respect current consent. Review user assignments and remove obsolete privileges.

Keep published learning resources versioned. Existing multiplayer rooms reject changed/withdrawn source versions; participants should start a new room. Expired rooms contain bounded activity data and need a documented retention policy before long-term production use. Do not delete immutable audit history as routine cleanup.

Maintain original/English interface copy together and seek fluent review. Check new communities for missing fields, absent speech voices and empty content. A configurable community is not a populated, reviewed cultural repository.

Document model changes, purpose, limitations, evaluation results, rollback choice and cultural review. Generated assistance stays distinct from reviewed repository content. Keep the [technical guide](PRD_TECHNICAL_AND_MODEL_GUIDE.md), [training guide](PRD_ADMIN_AND_TRAINING_GUIDE.md) and [user guide](PRD_USER_GUIDE.md) with each release.

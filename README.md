# LuoLinguaAI

AI-powered digital platform for the preservation, learning, and promotion of the Dholuo language and Luo indigenous knowledge.

## Stack

- Next.js 15 (App Router), React 18; Node.js 20.19+ (validated on Node.js 24)
- TypeScript
- Tailwind CSS 4 + shadcn/ui (modern browsers)
- Prisma + Neon PostgreSQL
- NextAuth v5
- Google Gemini (embeddings + retrieval grounded chat)
- Cloudinary (authenticated media through permission checked application routes)

## Setup

1. Copy `.env.example` to `.env` and fill in values. Keep existing environment files when upgrading.
2. Install dependencies: `npm ci`
3. Generate the client: `npm run db:generate`; apply reviewed migrations with `npx prisma migrate deploy`.
4. On a new database only, seed with `npm run db:seed`. Do not reset or reseed an existing production database.
5. For everyday use and fast page loading, run `npm run build` once, then `npm start` and open `http://localhost:3000`. Repeat the build and restart after source changes. Production output lives in `.next-review`, separate from development's `.next` directory.
6. Use `npm run dev` when editing the source. Development compiles pages on demand, so its first visits are slower. Stop the existing server before starting another server on port 3000.

Verification: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
See [RECOVERY.md](RECOVERY.md) for recovery and [REPAIR_REPORT.md](REPAIR_REPORT.md) for repair details and verification limits.

## Importing the prepared Luo transcript corpus

After applying database migrations and seeding the `luo` language and `oral_histories` module, an authorized operator can import the prepared NLP corpus:

```sh
npm run corpus:import -- "path/to/corpus_validated.jsonl"
```

The import is repeatable by source segment ID, preserves source/session IDs and SHA-256 values, and stores corpus records as `research_only` / `internal`. It does not publish the transcripts or send them to Gemini. Changing their access scope requires a separate curator decision and record update.

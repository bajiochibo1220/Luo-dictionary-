# LuoLinguaAI

AI-powered digital platform for the preservation, learning, and promotion of the Dholuo language and Luo indigenous knowledge.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + Neon PostgreSQL
- NextAuth v5
- OpenAI (embeddings + RAG)
- Cloudflare R2 (media storage)

## Setup

1. Copy `.env.example` to `.env.local` and fill in values
2. Install dependencies: `pnpm install`
3. Run migrations: `pnpm prisma migrate dev`
4. Seed database: `pnpm tsx scripts/seed-database.ts`
5. Start dev server: `pnpm dev`

## Importing the prepared Luo transcript corpus

After applying database migrations and seeding the `luo` language and `oral_histories` module, an authorized operator can import the prepared NLP corpus:

```sh
npm run corpus:import -- "path/to/corpus_validated.jsonl"
```

The import is repeatable by source segment ID, preserves source/session IDs and SHA-256 values, and stores corpus records as `research_only` / `internal`. It does not publish the transcripts or send them to Gemini. Changing their access scope requires a separate curator decision and record update.

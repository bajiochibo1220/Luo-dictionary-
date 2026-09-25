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

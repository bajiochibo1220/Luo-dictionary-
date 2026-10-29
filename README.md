# Luo Heritage

AI-powered digital platform for the preservation, learning, and promotion of the Dholuo language and Luo indigenous knowledge.

The app is branded **Luo Heritage**, with the tagline *Language · Culture · Living memory*. The shared name lives in `src/lib/brand.ts`; the original icon and installation exports are documented in `public/icons/README.md`. Desktop public and admin sidebars can collapse from their header controls and remember separate preferences. On phones, the menu button opens a keyboard-accessible drawer without covering the logo.

Installed apps and browser tabs check for a new release after initial loading, once a minute while visible, and when returning online or to the app. Each production build automatically gets a fresh ID, shared by the UI and the uncached `/api/app-version` endpoint. The update notice offers **Update now** or **Later**; it never reloads unfinished work automatically. Find manual checks and icon replacement instructions at `/mobile-apps` or **App updates & installation** in the account menu. Development mode does not show release alerts. Both manifests retain their original app IDs and URLs and use identical full-color icon artwork; a browser may ask for approval of installed icon/name changes, or an old shortcut may need one-time reinstallation and repinning.

## Web application user manual

For the common web/Android/iOS interface, open `/application`. See the [current full-system implementation status](docs/FULL_SYSTEM_IMPLEMENTATION_STATUS.md) and [Sunday trainer quick start](docs/TRAINER_QUICK_START.md) for delivered workflows, configuration, verification and remaining requirements. The reference documents do not define separate runtime phases.

Open **Help & training** for the current manual selected for your assigned duties; **Download my guide** exports the current wording. The [public user guide](docs/PRD_USER_GUIDE.md) and [administrator/training guide](docs/PRD_ADMIN_AND_TRAINING_GUIDE.md) include password management, English/Dholuo interface behavior and publication during review. The older [web manual](docs/LUO_HERITAGE_WEB_USER_MANUAL.md) and its PDF/Word/HTML exports are retained as historical editions.

**This manual is for the web application only. Android and iOS applications are still in development.** It identifies unfinished features and does not certify that the full project is complete.

## Stack

- Next.js 15.5.28 (App Router), React 18; Node.js 22+ (validated on Node.js 24)
- TypeScript
- Tailwind CSS 4 + shadcn/ui (modern browsers)
- Prisma + Neon PostgreSQL
- NextAuth v5
- DeepSeek or Groq (chat, tutor, translations, summaries, OCR and image descriptions)
- Public text retrieval without an external embedding service
- Cloudinary (authenticated media through permission checked application routes)

## Setup

1. Copy `.env.example` to `.env` and fill in values. Keep existing environment files when upgrading.
2. Install dependencies: `npm ci`
3. Generate the client: `npm run db:generate`; apply reviewed migrations with `npx prisma migrate deploy`.
4. On a new database only, seed with `npm run db:seed`. Do not reset or reseed an existing production database.
5. For everyday use and fast page loading, run `npm run build` once, then `npm start` and open `http://localhost:3000`. Repeat the build and restart after source changes. Local production output lives in `.next-review`, separate from development's `.next` directory. Vercel builds use `.next`, matching its Next.js framework settings. `.vercelignore` excludes local build caches, reference data, browser profiles, backups, and environment files from deployment; configure production environment variables in Vercel.
6. Use `npm run dev` when editing the source. Development compiles pages on demand, so its first visits are slower. Stop the existing server before starting another server on port 3000.

Verification: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
See [RECOVERY.md](RECOVERY.md) for recovery and [REPAIR_REPORT.md](REPAIR_REPORT.md) for repair details and verification limits.

## Production domain

The public website is https://culturalheritage.com.co. In the Vercel project's **Settings > Environment Variables**, set these values for **Production**, then redeploy:

```dotenv
AUTH_URL=https://culturalheritage.com.co
NEXTAUTH_URL=https://culturalheritage.com.co
APP_PUBLIC_URL=https://culturalheritage.com.co
NEXT_PUBLIC_APP_URL=https://culturalheritage.com.co
```

`AUTH_URL` takes priority over the legacy `NEXTAUTH_URL`; neither should retain the old Vercel address. `APP_PUBLIC_URL` controls account recovery and verification links. These are hosting settings, separate from the administrator's AI API credentials. Editing the local `.env` does not update Vercel. Keep localhost values for local development. If Render also runs this application's authentication or account services, update its corresponding production URL settings and redeploy that service too.

For Google sign-in, add `https://culturalheritage.com.co/api/auth/callback/google` to the Google OAuth client's **Authorized redirect URIs**. If that client uses **Authorized JavaScript origins**, add `https://culturalheritage.com.co` there too.

After redeployment, visit `https://culturalheritage.com.co/api/auth/providers`: every `signinUrl` and `callbackUrl` should use the custom domain. Start a fresh browser session on the custom domain, sign in, navigate the dashboards and sign out. Sessions on the old domain do not transfer to the new domain.

## Importing the prepared Luo transcript corpus

After applying database migrations and seeding the `luo` language and `oral_histories` module, an authorized operator can import the prepared NLP corpus:

```sh
npm run corpus:import -- "path/to/corpus_validated.jsonl"
```

The import is repeatable by source segment ID, preserves source/session IDs and SHA-256 values, and stores corpus records as `research_only` / `internal`. It does not publish the transcripts or send them to the AI provider. Changing their access scope requires a separate curator decision and record update.

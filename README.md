# MODO

MODO is a bilingual, mobile-first landing page for adaptable space-saving furniture in Addis Ababa. The repository contains the public landing page, English/Amharic switcher, founding-member waitlist, Telegram onboarding foundation, Manus OAuth, protected `/admiin` admin route, and analytics dashboard.

## Repository status

This repository is a clean export of the current MODO implementation. Managed WebDev metadata, credentials, generated logs, and deployment artifacts are intentionally excluded. The current waitlist/auth/admin implementation still uses its existing persistence contract; the Vercel Blob store has been verified independently and the Blob repository migration should be completed as a separate reviewed change before removing `DATABASE_URL`.

## Local development

```bash
pnpm install
cp env.example .env.local
pnpm dev
```

Use [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for the meaning of each variable. Never commit `.env.local`.

## Quality checks

```bash
pnpm check
pnpm test
pnpm build:client
```

`pnpm build:client` creates the Vite output in `dist/public`. Vercel uses the same command through `vercel.json`; `api/index.ts` exposes the Express/tRPC/OAuth/Telegram API as a serverless function.

## GitHub and Vercel workflow

1. Create a **private** GitHub repository named `modo` or `modo-furniture`.
2. Add this repository as the local remote and push `main`:

   ```bash
   git remote add origin git@github.com:YOUR_ACCOUNT/YOUR_REPO.git
   git add .
   git commit -m "chore: initialize MODO Vercel repository"
   git push -u origin main
   ```

3. Import the private GitHub repository into Vercel.
4. Configure the variables listed in [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).
5. Connect the private Vercel Blob store to Preview and Production.
6. Use pull requests for Preview deployments. Merge to `main` only after Preview checks pass.

GitHub Actions runs type checking, tests, and the client production build on pull requests and pushes to `main`. Vercel’s Git integration handles Preview and Production deployment; no Vercel token is committed to this repository.

## Important routes

- `/` — public landing page
- `/admiin` — protected admin and analytics dashboard
- `/api/trpc` — tRPC procedures
- `/api/oauth/callback` — Manus OAuth callback
- `/api/telegram/webhook` — authenticated Telegram webhook

## Data migration note

Vercel Blob is object storage, not a relational database. The intended Blob model is append-only lead, event, analytics, and Telegram objects with date-partitioned prefixes, idempotency keys, pagination, and ETag-protected snapshots. Do not replace the current database layer casually; complete and review that repository migration before production cutover.

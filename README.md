# MODO

MODO is a bilingual, mobile-first landing page for adaptable space-saving furniture in Addis Ababa. The repository contains the public landing page, English/Amharic switcher, founding-member waitlist, Telegram onboarding foundation, Manus OAuth, protected `/admiin` admin route, analytics dashboard, and Upstash Redis persistence.

## Repository status

This repository is a clean export of the current MODO implementation. Managed WebDev metadata, credentials, generated logs, and deployment artifacts are intentionally excluded. Users, waitlist entries, Telegram onboarding state, and analytics are stored in Upstash Redis through its serverless REST API. Vercel Blob is optional and reserved for future file assets.

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
5. Install the Upstash Redis integration and connect the Redis database to Preview and Production.
6. Use pull requests for Preview deployments. Merge to `main` only after Preview checks pass.

GitHub Actions runs type checking, tests, and the client production build on pull requests and pushes to `main`. Vercel’s Git integration handles Preview and Production deployment; no Vercel token is committed to this repository.

## Important routes

- `/` — public landing page
- `/admiin` — protected admin and analytics dashboard
- `/api/trpc` — tRPC procedures
- `/api/oauth/callback` — Manus OAuth callback
- `/api/telegram/webhook` — authenticated Telegram webhook

## Data migration note

Upstash Redis is the application persistence layer. The adapter uses namespaced JSON records and sorted-set indexes for users, waitlist entries, Telegram onboarding, and date-filtered analytics. Vercel Blob is not required for the current application.

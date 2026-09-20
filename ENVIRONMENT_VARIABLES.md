# MODO environment variables

Configure these in the Vercel project settings. Use separate Preview and Production values where appropriate. Never commit a `.env` file or paste secret values into GitHub issues.

## Public variables

| Variable | Purpose |
|---|---|
| `VITE_APP_ID` | Manus OAuth application/project ID |
| `VITE_APP_TITLE` | Browser title and product name |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `VITE_ANALYTICS_ENDPOINT` | Umami-compatible analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website identifier |

## Server-only variables

| Variable | Purpose |
|---|---|
| `OAUTH_SERVER_URL` | Manus OAuth API base URL |
| `JWT_SECRET` | Session-cookie signing secret |
| `OWNER_OPEN_ID` | Owner identity used for admin role assignment |
| `OWNER_NAME` | Owner display name |
| `MODO_PUBLIC_URL` | Public site URL used by Telegram onboarding |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `TELEGRAM_ADMIN_CHAT_ID` | Founder/admin notification chat ID |
| `TELEGRAM_INVITE_LINK` | Private Founder’s Circle invite link |
| `TELEGRAM_WEBHOOK_SECRET` | Telegram webhook secret header value |
| `DATABASE_URL` | Current persistence connection; retained until the Blob repository migration is merged |
| `BLOB_READ_WRITE_TOKEN` | Automatically supplied when the Vercel Blob store is connected |

## Vercel setup

1. Import this repository into a private GitHub repository.
2. Import the GitHub repository into Vercel.
3. Set the framework to **Vite**; `vercel.json` supplies the build/output settings.
4. Connect the private Blob store to Preview and Production so `BLOB_READ_WRITE_TOKEN` is injected.
5. Add Manus OAuth redirect configuration for `https://YOUR_DOMAIN/api/oauth/callback`.
6. Set the Telegram webhook to `https://YOUR_DOMAIN/api/telegram/webhook` with the matching secret header.
7. Keep Preview and Production secrets separate.

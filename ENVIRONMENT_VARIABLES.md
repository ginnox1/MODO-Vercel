# MODO environment variables

Configure these in the Vercel project settings. Use separate Preview and Production values where appropriate. Never commit a `.env` file or paste secret values into GitHub issues.

## Public variables

| Variable | Purpose |
|---|---|
| `VITE_APP_TITLE` | Browser title and product name |
| `VITE_ANALYTICS_ENDPOINT` | Umami-compatible analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website identifier |

## Server-only variables

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Session-cookie signing secret (long random value) |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID for admin sign-in |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret |
| `ADMIN_EMAIL` | The only Google account allowed to sign in and act as admin |
| `MODO_PUBLIC_URL` | Public site URL used by Telegram onboarding |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `TELEGRAM_ADMIN_CHAT_ID` | Founder/admin notification chat ID |
| `TELEGRAM_INVITE_LINK` | Private Founder’s Circle invite link |
| `TELEGRAM_WEBHOOK_SECRET` | Telegram webhook secret header value (letters, digits, `_`, `-`) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint (`https://…upstash.io`) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `KV_REST_API_URL` | Legacy Upstash/Vercel integration alias accepted as a fallback |
| `KV_REST_API_TOKEN` | Legacy Upstash/Vercel integration alias accepted as a fallback |

## Vercel setup

1. Import this repository into a private GitHub repository.
2. Import the GitHub repository into Vercel.
3. Set the framework to **Vite**; `vercel.json` supplies the build/output settings and pins functions to `fra1` (keep this next to your Upstash database region).
4. Create an Upstash Redis database (the free plan is enough) and add its REST URL and token as the two `UPSTASH_REDIS_REST_*` variables.
5. In Google Cloud, create an OAuth client of type **Web application** and register `https://YOUR_DOMAIN/api/oauth/callback` (plus `http://localhost:3000/api/oauth/callback` for local development) as an authorized redirect URI. Keep the consent screen in **Testing** with only the admin account as a test user.
6. Set the Telegram webhook to `https://YOUR_DOMAIN/api/telegram/webhook` with the matching secret header.
7. Keep Preview and Production secrets separate. Google does not accept wildcard redirect URIs, so admin sign-in works only on the registered domain and localhost.

The application stores users, waitlist entries, Telegram onboarding state, and analytics in Upstash Redis. Vercel Blob is not required for application persistence and may be reserved for future file assets.

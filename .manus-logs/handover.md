The next phase is runtime configuration and production smoke testing.
1. Connect Upstash Redis
In Vercel:
Open the modo-vercel project.
Go to Storage or Integrations.
Select Upstash Redis.
Create a Redis database.
Choose Frankfurt if available.
Connect it to both:
Production
Preview
Vercel should add one of these variable pairs:
text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
or:
text
KV_REST_API_URL
KV_REST_API_TOKEN
The MODO code supports both pairs.
After connecting it, redeploy the latest main commit.
2. Complete the remaining Vercel environment variables
Go to:
Vercel → modo-vercel → Settings → Environment Variables
You should already have these:
text
VITE_APP_TITLE
VITE_OAUTH_PORTAL_URL
OAUTH_SERVER_URL
MODO_PUBLIC_URL
TELEGRAM_ADMIN_CHAT_ID
TELEGRAM_INVITE_LINK
Add the remaining values:
text
VITE_APP_ID
OWNER_OPEN_ID
JWT_SECRET
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
Apply secret variables to both Production and Preview.
Do not add DATABASE_URL. It is no longer used.
Generate secrets locally
In PowerShell:
powershell
$jwt = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
$webhook = [Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 })).ToLower()

Write-Host "JWT_SECRET=$jwt"
Write-Host "TELEGRAM_WEBHOOK_SECRET=$webhook"
Enter these directly into Vercel as sensitive variables.
3. Finish Manus OAuth
In the Manus Developer settings for the MODO application, register this exact callback:
text
https://modo-vercel.vercel.app/api/oauth/callback
Register the homepage:
text
https://modo-vercel.vercel.app
Then set:
text
VITE_APP_ID=<your Manus application ID>
The callback must exactly match the deployed hostname. If you later add a custom domain, register that domain’s callback too.
4. Set the admin identity
Set:
text
OWNER_OPEN_ID=<your Manus Open ID>
OWNER_NAME=Araya Mengistu
OWNER_OPEN_ID must be the stable Manus Open ID, not your email address.
This value is important because the application promotes the matching Manus user to the admin role when they sign in.
5. Register the Telegram webhook
After the Vercel environment variables are saved and the deployment is live, run this from PowerShell:
powershell
$token = "YOUR_TELEGRAM_BOT_TOKEN"
$secret = "YOUR_TELEGRAM_WEBHOOK_SECRET"

Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.telegram.org/bot$token/setWebhook" `
  -Body @{
    url = "https://modo-vercel.vercel.app/api/telegram/webhook"
    secret_token = $secret
    allowed_updates = '["message","chat_join_request","chat_member"]'
  }
Check the webhook:
powershell
Invoke-RestMethod `
  -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
Confirm that:
text
url = https://modo-vercel.vercel.app/api/telegram/webhook
last_error_message
does not show an active error.
6. Redeploy after variables are saved
In Vercel:
Open Deployments.
Select the latest deployment.
Choose Redeploy.
Disable Use existing Build Cache for the first environment-configured redeploy.
Environment variables are only available to new builds/functions after deployment.
7. Production smoke test
Test the public site:
text
https://modo-vercel.vercel.app/
Verify:
Landing page loads
English/Amharic switcher works
Rotating hero words work
Waitlist form submits
Telegram CTA appears after signup
Test authentication:
Sign in through Manus.
Open:
text
https://modo-vercel.vercel.app/admiin
Confirm the admin dashboard opens.
Confirm the waitlist and analytics sections load.
Test persistence:
Submit a test waitlist entry.
Refresh the page.
Confirm the entry appears in /admiin.
Confirm the analytics count updates.
Check the Upstash Redis database for the new modo:* keys.
Test Telegram:
Submit a test waitlist entry with Telegram opt-in.
Open the generated Telegram link.
Send /start.
Confirm the bot links the Telegram account.
Confirm the founder notification arrives.
Test /help.
Test /reserve.
8. Do not connect Blob
Blob is no longer required for MODO’s current application persistence. Leave it disconnected unless you later need it for:
Product images
Catalog files
Design documents
Other large media assets
The current runtime data now belongs in Upstash Redis.
Recommended order from here
Connect Upstash.
Add the remaining Vercel variables.
Configure Manus OAuth callback.
Redeploy.
Test waitlist and admin.
Register and test Telegram webhook.
Test the complete website-to-Telegram conversion loop.
The most important immediate action is connecting Upstash Redis and redeploying, because the application will not be able to persist waitlist or analytics data until the Redis variables are available.
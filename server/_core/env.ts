export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  adminEmail: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
  redisRestUrl: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "",
  redisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "",
  publicUrl: process.env.MODO_PUBLIC_URL ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID ?? "",
  telegramInviteLink: process.env.TELEGRAM_INVITE_LINK ?? "",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(ENV.adminEmail) && email?.trim().toLowerCase() === ENV.adminEmail;
}

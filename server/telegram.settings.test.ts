import { describe, expect, it } from "vitest";

const requiredSettings = [
  process.env.MODO_PUBLIC_URL,
  process.env.TELEGRAM_ADMIN_CHAT_ID,
  process.env.TELEGRAM_INVITE_LINK,
  process.env.TELEGRAM_WEBHOOK_SECRET,
];
const hasProductionSettings = requiredSettings.every(Boolean);

describe("Telegram onboarding settings", () => {
  it.skipIf(!hasProductionSettings)("has production onboarding settings configured server-side", () => {
    expect(process.env.MODO_PUBLIC_URL).toMatch(/^https:\/\//);
    expect(process.env.TELEGRAM_ADMIN_CHAT_ID).not.toMatch(/^VITE_/);
    expect(process.env.TELEGRAM_INVITE_LINK).toMatch(/^https:\/\/t\.me\/\+/);
    expect(process.env.TELEGRAM_WEBHOOK_SECRET).toMatch(/^[a-f0-9]{48}$/);
  });
});

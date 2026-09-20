import { describe, expect, it } from "vitest";

describe("Telegram onboarding settings", () => {
  it("has production onboarding settings configured server-side", () => {
    expect(process.env.MODO_PUBLIC_URL).toBe("https://modofurni-a6ws7xz2.manus.space");
    expect(process.env.TELEGRAM_ADMIN_CHAT_ID).toBe("575214027");
    expect(process.env.TELEGRAM_INVITE_LINK).toMatch(/^https:\/\/t\.me\/\+/);
    expect(process.env.TELEGRAM_WEBHOOK_SECRET).toMatch(/^[a-f0-9]{48}$/);
    expect(process.env.TELEGRAM_ADMIN_CHAT_ID).not.toMatch(/^VITE_/);
  });
});

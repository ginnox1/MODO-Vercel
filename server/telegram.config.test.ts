import { describe, expect, it } from "vitest";

describe("Telegram conversion loop configuration", () => {
  it("accepts the configured bot token with Telegram getMe", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token, "TELEGRAM_BOT_TOKEN must be configured").toBeTruthy();

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const payload = (await response.json()) as { ok?: boolean; result?: { username?: string } };

    expect(response.ok).toBe(true);
    expect(payload.ok).toBe(true);
    expect(payload.result?.username).toBe("ModoFurnitureBot");
  }, 15_000);
});

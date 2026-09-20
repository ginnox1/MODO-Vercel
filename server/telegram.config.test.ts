import { describe, expect, it } from "vitest";

const token = process.env.TELEGRAM_BOT_TOKEN;
const runLiveTest = process.env.RUN_TELEGRAM_LIVE_TEST === "true";

describe("Telegram conversion loop configuration", () => {
  it.skipIf(!token || !runLiveTest)("accepts the configured bot token with Telegram getMe", async () => {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const payload = (await response.json()) as { ok?: boolean; result?: { username?: string } };

    expect(response.ok).toBe(true);
    expect(payload.ok).toBe(true);
    expect(payload.result?.username).toBe("ModoFurnitureBot");
  }, 15_000);
});

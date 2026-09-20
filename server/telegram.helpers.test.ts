import { describe, expect, it } from "vitest";
import type { Express } from "express";
import { normalizeEthiopianPhone } from "./db";
import { displayName } from "./telegram";
import { registerTelegramWebhook } from "./telegramWebhook";

describe("Telegram conversion helpers", () => {
  it("normalizes Ethiopian local phone numbers", () => {
    expect(normalizeEthiopianPhone("0911 234 567")).toBe("+251911234567");
    expect(normalizeEthiopianPhone("+251 911 234 567")).toBe("+251911234567");
  });

  it("builds a useful Telegram display name", () => {
    expect(displayName({ id: 7, first_name: "Marta", last_name: "Fekadu" })).toBe("Marta Fekadu");
    expect(displayName({ id: 8, username: "modo_member" })).toBe("modo_member");
  });

  it("rejects webhook requests without the configured Telegram secret", async () => {
    let handler: ((req: unknown, res: { sendStatus: (status: number) => void }) => Promise<void>) | undefined;
    registerTelegramWebhook({ post: (_path: string, callback: typeof handler) => { handler = callback; } } as unknown as Express);
    const statuses: number[] = [];
    await handler?.({ header: () => "wrong-secret", body: {} }, { sendStatus: (status) => statuses.push(status) });
    expect(statuses).toEqual([401]);
  });
});

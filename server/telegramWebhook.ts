import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { handleTelegramUpdate, TelegramUpdate } from "./telegram";

export function registerTelegramWebhook(app: Express) {
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    if (!ENV.telegramWebhookSecret || req.header("X-Telegram-Bot-Api-Secret-Token") !== ENV.telegramWebhookSecret) {
      res.sendStatus(401);
      return;
    }

    try {
      const update = req.body as TelegramUpdate;
      await handleTelegramUpdate(update);
      res.sendStatus(200);
    } catch (error) {
      console.error("[Telegram] Webhook handling failed:", error);
      res.sendStatus(500);
    }
  });
}

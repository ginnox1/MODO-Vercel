import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { registerTelegramWebhook } from "./telegramWebhook";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerTelegramWebhook(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext }),
  );
  return app;
}

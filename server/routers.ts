import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { createAnalyticsEvent, createWaitlistEntry, getAnalyticsSummary, listWaitlistEntries } from "./db.js";
import { ENV } from "./_core/env.js";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  waitlist: router({
    join: publicProcedure
      .input(
        z.object({
          fullName: z.string().trim().min(2).max(120),
          phone: z.string().trim().min(7).max(32),
          telegramOptIn: z.boolean().default(false),
          telegramHandle: z.string().trim().max(64).optional(),
          notificationPreference: z.enum(["phone", "telegram"]).default("phone"),
        }),
      )
      .mutation(async ({ input }) => {
        const result = await createWaitlistEntry(input);
        return {
          ...result,
          telegramStartUrl: result.deepLinkToken ? `https://t.me/ModoFurnitureBot?start=${result.deepLinkToken}` : null,
          telegramInviteLink: ENV.telegramInviteLink || null,
        };
      }),
    list: adminProcedure.query(() => listWaitlistEntries()),
  }),
  analytics: router({
    record: publicProcedure.input(z.object({ eventName: z.string().trim().min(1).max(64), source: z.string().trim().max(120).default("direct"), browser: z.string().trim().max(64).default("unknown"), location: z.string().trim().max(120).default("unknown"), path: z.string().trim().max(255), referrer: z.string().trim().max(512).optional() })).mutation(({ input }) => createAnalyticsEvent({ ...input, referrer: input.referrer ?? null })),
    summary: adminProcedure.input(z.object({ days: z.union([z.literal(1), z.literal(7), z.literal(30), z.literal(90)]) })).query(({ input }) => getAnalyticsSummary(new Date(Date.now() - input.days * 24 * 60 * 60 * 1000))),
  }),
});

export type AppRouter = typeof appRouter;

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  sorted: new Map<string, Array<{ score: number; member: string }>>(),
  sequences: new Map<string, number>(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    async get<T>(key: string): Promise<T | null> {
      return (state.values.get(key) as T | undefined) ?? null;
    }

    async set(key: string, value: unknown): Promise<string> {
      state.values.set(key, value);
      return "OK";
    }

    async incr(key: string): Promise<number> {
      const next = (state.sequences.get(key) ?? 0) + 1;
      state.sequences.set(key, next);
      return next;
    }

    async zadd(key: string, item: { score: number; member: string }): Promise<number> {
      const items = state.sorted.get(key) ?? [];
      const existing = items.findIndex((entry) => entry.member === item.member);
      if (existing >= 0) items.splice(existing, 1);
      items.push(item);
      state.sorted.set(key, items);
      return 1;
    }

    async zrange<T>(key: string, min: number, max: number, options?: { rev?: boolean; byScore?: boolean }): Promise<T> {
      let items = [...(state.sorted.get(key) ?? [])].sort((a, b) => a.score - b.score);
      if (options?.byScore) {
        const lower = Math.min(min, max);
        const upper = Math.max(min, max);
        items = items.filter((item) => item.score >= lower && item.score <= upper);
      }
      if (options?.rev) items.reverse();
      const start = options?.byScore || min < 0 ? 0 : min;
      const end = max === -1 || options?.byScore ? items.length : max + 1;
      return items.slice(start, end).map((item) => item.member) as T;
    }
  },
}));

import { ENV } from "./_core/env";
import {
  createAnalyticsEvent,
  createWaitlistEntry,
  getAnalyticsSummary,
  getWaitlistByDeepLinkToken,
  getWaitlistByTelegramUserId,
  linkTelegramAccount,
  listWaitlistEntries,
  markJoinRequested,
  markTelegramJoined,
  upsertUser,
  getUserByOpenId,
} from "./db";

describe("Upstash Redis persistence", () => {
  beforeEach(() => {
    state.values.clear();
    state.sorted.clear();
    state.sequences.clear();
    ENV.redisRestUrl = "https://redis.test";
    ENV.redisRestToken = "test-token";
  });

  it("persists and retrieves a waitlist entry through its deep-link index", async () => {
    const created = await createWaitlistEntry({ fullName: "Marta Fekadu", phone: "0911 234 567" });
    const entry = await getWaitlistByDeepLinkToken(created.deepLinkToken);

    expect(entry).toMatchObject({
      id: created.id,
      fullName: "Marta Fekadu",
      phone: "+251911234567",
      onboardingStatus: "PENDING_TG",
    });
  });

  it("preserves Telegram linking and lifecycle status transitions", async () => {
    const created = await createWaitlistEntry({ fullName: "Marta Fekadu", phone: "0911234567" });
    await linkTelegramAccount(created.id, "telegram-7", "chat-7", "marta");
    await markJoinRequested(created.id);
    await markTelegramJoined("telegram-7");

    const entry = await getWaitlistByTelegramUserId("telegram-7");
    expect(entry).toMatchObject({
      telegramUserId: "telegram-7",
      telegramChatId: "chat-7",
      telegramHandle: "marta",
      onboardingStatus: "JOINED_TG",
    });
  });

  it("preserves admin identity and aggregates date-filtered analytics", async () => {
    await upsertUser({ openId: "owner-7", name: "Owner", role: "admin" });
    await createWaitlistEntry({ fullName: "Marta Fekadu", phone: "0911234567" });
    await createAnalyticsEvent({ eventName: "page-view", source: "telegram", browser: "Chrome", location: "Addis Ababa", path: "/", referrer: null });
    await createAnalyticsEvent({ eventName: "waitlist-signup", source: "telegram", browser: "Chrome", location: "Addis Ababa", path: "/", referrer: null });

    const owner = await getUserByOpenId("owner-7");
    const summary = await getAnalyticsSummary(new Date(Date.now() - 60_000));
    const entries = await listWaitlistEntries();

    expect(owner?.role).toBe("admin");
    await upsertUser({ openId: "owner-7", name: "Owner Renamed" });
    expect((await getUserByOpenId("owner-7"))?.role).toBe("admin");
    expect(summary.totalViews).toBe(1);
    expect(summary.waitlistSignups).toBe(1);
    expect(summary.sources).toEqual([{ label: "telegram", count: 1 }]);
    expect(entries).toHaveLength(1);
  });
});

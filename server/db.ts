import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import type { AnalyticsEvent, InsertUser, InsertWaitlistEntry, User, WaitlistEntry } from "../drizzle/schema";
import { ENV } from "./_core/env.js";

const KEY_PREFIX = "modo";
const userKey = (openId: string) => `${KEY_PREFIX}:user:${openId}`;
const waitlistKey = (id: number) => `${KEY_PREFIX}:waitlist:${id}`;
const deepLinkKey = (token: string) => `${KEY_PREFIX}:waitlist:deep-link:${token}`;
const telegramKey = (telegramUserId: string) => `${KEY_PREFIX}:waitlist:telegram:${telegramUserId}`;
const analyticsKey = (id: number) => `${KEY_PREFIX}:analytics:${id}`;
const waitlistIndexKey = `${KEY_PREFIX}:waitlist:created`;
const analyticsIndexKey = `${KEY_PREFIX}:analytics:created`;
const waitlistSequenceKey = `${KEY_PREFIX}:sequence:waitlist`;
const analyticsSequenceKey = `${KEY_PREFIX}:sequence:analytics`;

let _redis: Redis | null = null;

function getRedis() {
  if (!_redis) {
    const url = ENV.redisRestUrl;
    const token = ENV.redisRestToken;
    if (!url || !token) {
      throw new Error("Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

function reviveDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function reviveUser(value: User): User {
  return {
    ...value,
    createdAt: reviveDate(value.createdAt),
    updatedAt: reviveDate(value.updatedAt),
    lastSignedIn: reviveDate(value.lastSignedIn),
  };
}

function reviveWaitlist(value: WaitlistEntry): WaitlistEntry {
  return {
    ...value,
    createdAt: reviveDate(value.createdAt),
    telegramLinkedAt: value.telegramLinkedAt ? reviveDate(value.telegramLinkedAt) : null,
    joinRequestedAt: value.joinRequestedAt ? reviveDate(value.joinRequestedAt) : null,
    joinedAt: value.joinedAt ? reviveDate(value.joinedAt) : null,
  };
}

function reviveAnalytics(value: AnalyticsEvent): AnalyticsEvent {
  return { ...value, createdAt: reviveDate(value.createdAt) };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const redis = getRedis();
  const existing = await redis.get<User>(userKey(user.openId));
  const now = new Date();
  const merged: User = {
    id: existing?.id ?? await redis.incr(`${KEY_PREFIX}:sequence:user`),
    openId: user.openId,
    name: user.name !== undefined ? user.name : existing?.name ?? null,
    email: user.email !== undefined ? user.email : existing?.email ?? null,
    loginMethod: user.loginMethod !== undefined ? user.loginMethod : existing?.loginMethod ?? null,
    role: user.role ?? existing?.role ?? "user",
    createdAt: existing?.createdAt ? reviveDate(existing.createdAt) : now,
    updatedAt: now,
    lastSignedIn: user.lastSignedIn ? reviveDate(user.lastSignedIn) : now,
  };
  await redis.set(userKey(user.openId), merged);
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const value = await getRedis().get<User>(userKey(openId));
  return value ? reviveUser(value) : undefined;
}

export async function createWaitlistEntry(entry: InsertWaitlistEntry) {
  const redis = getRedis();
  const id = await redis.incr(waitlistSequenceKey);
  const deepLinkToken = entry.deepLinkToken ?? nanoid(16);
  const createdAt = new Date();
  const waitlistEntry: WaitlistEntry = {
    id,
    fullName: entry.fullName,
    phone: normalizeEthiopianPhone(entry.phone),
    telegramOptIn: entry.telegramOptIn ?? false,
    telegramHandle: entry.telegramHandle ?? null,
    notificationPreference: entry.notificationPreference ?? "phone",
    onboardingStatus: entry.onboardingStatus ?? "PENDING_TG",
    deepLinkToken,
    telegramUserId: entry.telegramUserId ?? null,
    telegramChatId: entry.telegramChatId ?? null,
    telegramLinkedAt: entry.telegramLinkedAt ?? null,
    joinRequestedAt: entry.joinRequestedAt ?? null,
    joinedAt: entry.joinedAt ?? null,
    createdAt,
  };

  await redis.set(waitlistKey(id), waitlistEntry);
  await redis.set(deepLinkKey(deepLinkToken), String(id));
  await redis.zadd(waitlistIndexKey, { score: createdAt.getTime(), member: String(id) });
  return { success: true, id, deepLinkToken } as const;
}

export function normalizeEthiopianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("251")) return `+${digits}`;
  if (digits.startsWith("0")) return `+251${digits.slice(1)}`;
  return digits.startsWith("9") ? `+251${digits}` : `+${digits}`;
}

export async function getWaitlistByDeepLinkToken(deepLinkToken: string) {
  const id = await getRedis().get<string>(deepLinkKey(deepLinkToken));
  if (!id) return undefined;
  return getWaitlistById(Number(id));
}

export async function getWaitlistByTelegramUserId(telegramUserId: string) {
  const id = await getRedis().get<string>(telegramKey(telegramUserId));
  if (!id) return undefined;
  return getWaitlistById(Number(id));
}

async function getWaitlistById(id: number): Promise<WaitlistEntry | undefined> {
  const value = await getRedis().get<WaitlistEntry>(waitlistKey(id));
  return value ? reviveWaitlist(value) : undefined;
}

async function saveWaitlistEntry(entry: WaitlistEntry) {
  await getRedis().set(waitlistKey(entry.id), entry);
}

export async function linkTelegramAccount(id: number, telegramUserId: string, telegramChatId: string, telegramHandle?: string | null) {
  const entry = await getWaitlistById(id);
  if (!entry) return;
  const updated: WaitlistEntry = {
    ...entry,
    telegramUserId,
    telegramChatId,
    telegramHandle: telegramHandle ?? null,
    telegramLinkedAt: new Date(),
  };
  await saveWaitlistEntry(updated);
  await getRedis().set(telegramKey(telegramUserId), String(id));
}

export async function markJoinRequested(id: number) {
  const entry = await getWaitlistById(id);
  if (!entry) return;
  await saveWaitlistEntry({ ...entry, onboardingStatus: "JOIN_REQUESTED", joinRequestedAt: new Date() });
}

export async function markTelegramJoined(telegramUserId: string) {
  const entry = await getWaitlistByTelegramUserId(telegramUserId);
  if (!entry) return;
  await saveWaitlistEntry({ ...entry, onboardingStatus: "JOINED_TG", joinedAt: new Date() });
}

export async function listWaitlistEntries(): Promise<WaitlistEntry[]> {
  const ids = await getRedis().zrange<string[]>(waitlistIndexKey, 0, -1, { rev: true });
  const entries = await Promise.all(ids.map((id) => getWaitlistById(Number(id))));
  return entries.filter((entry): entry is WaitlistEntry => Boolean(entry));
}

export async function createAnalyticsEvent(event: Omit<AnalyticsEvent, "id" | "createdAt">) {
  const redis = getRedis();
  const id = await redis.incr(analyticsSequenceKey);
  const createdAt = new Date();
  const analyticsEvent: AnalyticsEvent = { ...event, id, createdAt };
  await redis.set(analyticsKey(id), analyticsEvent);
  await redis.zadd(analyticsIndexKey, { score: createdAt.getTime(), member: String(id) });
  return { success: true } as const;
}

export async function getAnalyticsSummary(since: Date) {
  const redis = getRedis();
  const ids = await redis.zrange<string[]>(analyticsIndexKey, Date.now(), since.getTime(), { byScore: true, rev: true });
  const events = (await Promise.all(ids.map(async (id) => {
    const event = await redis.get<AnalyticsEvent>(analyticsKey(Number(id)));
    return event ? reviveAnalytics(event) : undefined;
  }))).filter((event): event is AnalyticsEvent => Boolean(event));
  const signups = (await listWaitlistEntries()).filter((entry) => entry.createdAt >= since);
  const pageViews = events.filter((event) => event.eventName === "page-view");
  const countBy = (key: "source" | "browser" | "location") => Object.entries(pageViews.reduce<Record<string, number>>((acc, event) => {
    acc[event[key]] = (acc[event[key]] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })).slice(0, 8);

  return {
    totalViews: pageViews.length,
    waitlistSignups: signups.length,
    sources: countBy("source"),
    browsers: countBy("browser"),
    locations: countBy("location"),
    recentEvents: events.slice(0, 12),
  };
}

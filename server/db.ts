import { desc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { AnalyticsEvent, InsertUser, InsertWaitlistEntry, analyticsEvents, users, waitlistEntries } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createWaitlistEntry(entry: InsertWaitlistEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const deepLinkToken = entry.deepLinkToken ?? nanoid(16);
  const phone = normalizeEthiopianPhone(entry.phone);
  const result = await db.insert(waitlistEntries).values({ ...entry, phone, deepLinkToken });
  return { success: true, id: Number((result as { insertId?: number }).insertId ?? 0), deepLinkToken } as const;
}

export function normalizeEthiopianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("251")) return `+${digits}`;
  if (digits.startsWith("0")) return `+251${digits.slice(1)}`;
  return digits.startsWith("9") ? `+251${digits}` : `+${digits}`;
}

export async function getWaitlistByDeepLinkToken(deepLinkToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(waitlistEntries).where(eq(waitlistEntries.deepLinkToken, deepLinkToken)).limit(1);
  return result[0];
}

export async function getWaitlistByTelegramUserId(telegramUserId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(waitlistEntries).where(eq(waitlistEntries.telegramUserId, telegramUserId)).limit(1);
  return result[0];
}

export async function linkTelegramAccount(id: number, telegramUserId: string, telegramChatId: string, telegramHandle?: string | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(waitlistEntries).set({ telegramUserId, telegramChatId, telegramHandle: telegramHandle ?? undefined, telegramLinkedAt: new Date() }).where(eq(waitlistEntries.id, id));
}

export async function markJoinRequested(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(waitlistEntries).set({ onboardingStatus: "JOIN_REQUESTED", joinRequestedAt: new Date() }).where(eq(waitlistEntries.id, id));
}

export async function markTelegramJoined(telegramUserId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(waitlistEntries).set({ onboardingStatus: "JOINED_TG", joinedAt: new Date() }).where(eq(waitlistEntries.telegramUserId, telegramUserId));
}

export async function listWaitlistEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waitlistEntries).orderBy(desc(waitlistEntries.createdAt));
}

export async function createAnalyticsEvent(event: Omit<AnalyticsEvent, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return { success: false } as const;
  await db.insert(analyticsEvents).values(event);
  return { success: true } as const;
}

export async function getAnalyticsSummary(since: Date) {
  const db = await getDb();
  if (!db) return { totalViews: 0, waitlistSignups: 0, sources: [], browsers: [], locations: [], recentEvents: [] };
  const events = await db.select().from(analyticsEvents).where(gte(analyticsEvents.createdAt, since)).orderBy(desc(analyticsEvents.createdAt));
  const signups = await db.select().from(waitlistEntries).where(gte(waitlistEntries.createdAt, since));
  const pageViews = events.filter((event) => event.eventName === "page-view");
  const countBy = (key: "source" | "browser" | "location") => Object.entries(pageViews.reduce<Record<string, number>>((acc, event) => { acc[event[key]] = (acc[event[key]] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
    .slice(0, 8);
  return { totalViews: pageViews.length, waitlistSignups: signups.length, sources: countBy("source"), browsers: countBy("browser"), locations: countBy("location"), recentEvents: events.slice(0, 12) };
}

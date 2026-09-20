import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing Manus OAuth and admin role checks. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const waitlistEntries = mysqlTable("waitlistEntries", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  telegramOptIn: boolean("telegramOptIn").default(false).notNull(),
  telegramHandle: varchar("telegramHandle", { length: 64 }),
  notificationPreference: mysqlEnum("notificationPreference", ["phone", "telegram"]).default("phone").notNull(),
  onboardingStatus: mysqlEnum("onboardingStatus", ["PENDING_TG", "JOIN_REQUESTED", "JOINED_TG", "RESERVED", "PAID"]).default("PENDING_TG").notNull(),
  deepLinkToken: varchar("deepLinkToken", { length: 32 }).unique(),
  telegramUserId: varchar("telegramUserId", { length: 64 }).unique(),
  telegramChatId: varchar("telegramChatId", { length: 64 }),
  telegramLinkedAt: timestamp("telegramLinkedAt"),
  joinRequestedAt: timestamp("joinRequestedAt"),
  joinedAt: timestamp("joinedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const analyticsEvents = mysqlTable("analyticsEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventName: varchar("eventName", { length: 64 }).notNull(),
  source: varchar("source", { length: 120 }).notNull(),
  browser: varchar("browser", { length: 64 }).notNull(),
  location: varchar("location", { length: 120 }).notNull(),
  path: varchar("path", { length: 255 }).notNull(),
  referrer: varchar("referrer", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = typeof waitlistEntries.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

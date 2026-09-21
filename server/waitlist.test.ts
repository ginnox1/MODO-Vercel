import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("waitlist", () => {
  it("rejects incomplete founding-member details", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.waitlist.join({ fullName: "A", phone: "123" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("blocks non-admin users from reading the waitlist", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.waitlist.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks non-admin users from reading analytics", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.analytics.summary({ days: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

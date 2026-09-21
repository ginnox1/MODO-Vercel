import express from "express";
import type { Request } from "express";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME, OAUTH_STATE_COOKIE } from "../shared/const";

const mocks = vi.hoisted(() => ({
  exchangeGoogleCode: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./_core/google", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./_core/google")>()),
  exchangeGoogleCode: mocks.exchangeGoogleCode,
}));
vi.mock("./db", () => ({
  upsertUser: mocks.upsertUser,
  getUserByOpenId: mocks.getUserByOpenId,
}));

import { ENV } from "./_core/env";
import { registerOAuthRoutes } from "./_core/oauth";
import { sdk } from "./_core/sdk";

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  registerOAuthRoutes(app);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  ENV.googleClientId = "client-id";
  ENV.googleClientSecret = "client-secret";
  ENV.adminEmail = "admin@example.com";
  ENV.cookieSecret = "test-secret-with-enough-length-for-hs256";
});

const get = (path: string, cookie?: string) =>
  fetch(`${base}${path}`, { redirect: "manual", headers: cookie ? { cookie } : {} });

const cookieValue = (response: Response, name: string) =>
  response.headers
    .getSetCookie()
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split(";")[0]
    .slice(name.length + 1);

const callback = (state = "state-1", extra = "") =>
  get(`/api/oauth/callback?code=code-1&state=${state}${extra}`, `${OAUTH_STATE_COOKIE}=state-1`);

describe("GET /api/auth/google", () => {
  it("redirects to Google with a state that matches the nonce cookie", async () => {
    const response = await get("/api/auth/google");
    const location = new URL(response.headers.get("location")!);
    const state = cookieValue(response, OAUTH_STATE_COOKIE);

    expect(response.status).toBe(302);
    expect(location.origin + location.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location.searchParams.get("client_id")).toBe("client-id");
    expect(location.searchParams.get("redirect_uri")).toBe(`${base}/api/oauth/callback`);
    expect(location.searchParams.get("scope")).toBe("openid email profile");
    expect(state).toBeTruthy();
    expect(location.searchParams.get("state")).toBe(state);
  });

  it("reports missing configuration instead of redirecting to Google", async () => {
    ENV.adminEmail = "";
    const response = await get("/api/auth/google");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/admiin?auth_error=config");
  });
});

describe("GET /api/oauth/callback", () => {
  it("rejects a state that does not match the nonce cookie", async () => {
    const response = await callback("forged-state");

    expect(response.status).toBe(403);
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
  });

  it("rejects a callback with no nonce cookie", async () => {
    const response = await get("/api/oauth/callback?code=code-1&state=state-1");

    expect(response.status).toBe(403);
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
  });

  it("signs in the admin account, ignoring email case", async () => {
    mocks.exchangeGoogleCode.mockResolvedValue({ sub: "sub-1", email: "Admin@Example.com", emailVerified: true, name: "Admin" });

    const response = await callback();

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/admiin");
    expect(cookieValue(response, COOKIE_NAME)).toBeTruthy();
    expect(mocks.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ openId: "google:sub-1", email: "Admin@Example.com", role: "admin" }),
    );
  });

  it("refuses any other Google account without creating a session or user", async () => {
    mocks.exchangeGoogleCode.mockResolvedValue({ sub: "sub-2", email: "someone@example.com", emailVerified: true, name: "Someone" });

    const response = await callback();

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/admiin?auth_error=forbidden");
    expect(cookieValue(response, COOKIE_NAME)).toBeUndefined();
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("refuses the admin email when Google reports it as unverified", async () => {
    mocks.exchangeGoogleCode.mockResolvedValue({ sub: "sub-3", email: "admin@example.com", emailVerified: false, name: "Admin" });

    const response = await callback();

    expect(response.headers.get("location")).toBe("/admiin?auth_error=forbidden");
    expect(cookieValue(response, COOKIE_NAME)).toBeUndefined();
  });

  it("reports a failed token exchange", async () => {
    mocks.exchangeGoogleCode.mockRejectedValue(new Error("invalid_grant"));

    const response = await callback();

    expect(response.headers.get("location")).toBe("/admiin?auth_error=failed");
    expect(cookieValue(response, COOKIE_NAME)).toBeUndefined();
  });

  it("reports a cancelled sign-in when the user denies consent", async () => {
    const response = await get("/api/oauth/callback?error=access_denied", `${OAUTH_STATE_COOKIE}=state-1`);

    expect(response.headers.get("location")).toBe("/admiin?auth_error=cancelled");
  });
});

describe("sdk.authenticateRequest", () => {
  const storedUser = (email: string | null, role: "user" | "admin") => ({
    id: 1,
    openId: "google:sub-1",
    name: "Someone",
    email,
    loginMethod: "google",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  });

  const requestWith = async (openId = "google:sub-1") => {
    const token = await sdk.createSessionToken(openId, { name: "Someone" });
    return { headers: { cookie: `${COOKIE_NAME}=${token}` } } as Request;
  };

  it("grants admin from the current ADMIN_EMAIL even if the stored role is user", async () => {
    mocks.getUserByOpenId.mockResolvedValue(storedUser("admin@example.com", "user"));

    expect((await sdk.authenticateRequest(await requestWith())).role).toBe("admin");
  });

  it("revokes a stored admin role when the email no longer matches ADMIN_EMAIL", async () => {
    mocks.getUserByOpenId.mockResolvedValue(storedUser("old-admin@example.com", "admin"));

    expect((await sdk.authenticateRequest(await requestWith())).role).toBe("user");
  });

  it("rejects requests without a valid session", async () => {
    await expect(sdk.authenticateRequest({ headers: {} } as Request)).rejects.toThrow();
    await expect(
      sdk.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=not-a-jwt` } } as Request),
    ).rejects.toThrow();
  });

  it("rejects a session for a user that no longer exists", async () => {
    mocks.getUserByOpenId.mockResolvedValue(undefined);

    await expect(sdk.authenticateRequest(await requestWith())).rejects.toThrow();
  });
});

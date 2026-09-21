import { COOKIE_NAME, OAUTH_STATE_COOKIE, SESSION_DURATION_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes } from "node:crypto";
import type { CookieOptions, Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV, isAdminEmail } from "./env";
import { buildGoogleAuthUrl, exchangeGoogleCode } from "./google";
import { sdk } from "./sdk";

const CALLBACK_PATH = "/api/oauth/callback";
const ADMIN_PATH = "/admiin";

// SameSite=Lax is enough: Google returns the browser to the callback with a
// top-level GET, which carries Lax cookies.
const STATE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim() || undefined;
}

function getRequestOrigin(req: Request): string {
  const proto = firstHeader(req.headers["x-forwarded-proto"]) ?? req.protocol;
  const host = firstHeader(req.headers["x-forwarded-host"]) ?? req.get("host");
  return `${proto}://${host}`;
}

function redirectWithError(res: Response, code: "forbidden" | "cancelled" | "failed" | "config") {
  res.redirect(302, `${ADMIN_PATH}?auth_error=${code}`);
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");

    if (!ENV.googleClientId || !ENV.googleClientSecret || !ENV.adminEmail) {
      console.error("[OAuth] GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and ADMIN_EMAIL must be set");
      redirectWithError(res, "config");
      return;
    }

    const state = randomBytes(24).toString("base64url");
    res.cookie(OAUTH_STATE_COOKIE, state, { ...STATE_COOKIE_OPTIONS, maxAge: 10 * 60 * 1000 });
    res.redirect(302, buildGoogleAuthUrl(`${getRequestOrigin(req)}${CALLBACK_PATH}`, state));
  });

  app.get(CALLBACK_PATH, async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");

    // CSRF guard: `state` must match the one-time cookie set when this browser
    // started the login. An attacker cannot plant that cookie in the victim's browser.
    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, STATE_COOKIE_OPTIONS);

    if (getQueryParam(req, "error")) {
      redirectWithError(res, "cancelled");
      return;
    }

    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state || !expectedState || state !== expectedState) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }

    try {
      const profile = await exchangeGoogleCode(code, `${getRequestOrigin(req)}${CALLBACK_PATH}`);

      if (!profile.emailVerified || !isAdminEmail(profile.email)) {
        console.warn("[OAuth] Rejected sign-in from a non-admin Google account");
        redirectWithError(res, "forbidden");
        return;
      }

      const openId = `google:${profile.sub}`;
      await db.upsertUser({
        openId,
        name: profile.name || null,
        email: profile.email,
        loginMethod: "google",
        role: "admin",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: profile.name || profile.email,
        expiresInMs: SESSION_DURATION_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_DURATION_MS,
      });
      res.redirect(302, ADMIN_PATH);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      redirectWithError(res, "failed");
    }
  });
}

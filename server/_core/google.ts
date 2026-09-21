import { createRemoteJWKSet, jwtVerify } from "jose";
import { ENV } from "./env";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const TIMEOUT_MS = 15_000;

const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", ENV.googleClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }

  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  if (!idToken) throw new Error("Google token response is missing id_token");

  const { payload } = await jwtVerify(idToken, jwks, { issuer: ISSUERS, audience: ENV.googleClientId });
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!payload.sub || !email) throw new Error("Google ID token is missing sub or email");

  return {
    sub: payload.sub,
    email,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: typeof payload.name === "string" ? payload.name : "",
  };
}

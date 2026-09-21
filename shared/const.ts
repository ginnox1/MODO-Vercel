export const COOKIE_NAME = "app_session_id";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// One-time nonce cookie that binds a Google sign-in to the browser that started
// it. The `__Host-` prefix forces the cookie host-only (Secure, Path=/, no Domain).
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";

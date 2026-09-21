export { COOKIE_NAME } from "@shared/const";

// The server handles the whole Google OAuth round trip; the browser only navigates.
export const startLogin = () => {
  window.location.href = "/api/auth/google";
};

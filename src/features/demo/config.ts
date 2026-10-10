import "server-only";

export const DEMO_EMAIL = "demo@mobileheart.local";
export const DEMO_PASSWORD = "Demo1234!";
export const DEMO_SESSION_COOKIE = "mobile-heart-demo-session";

export function isDemoSessionId(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

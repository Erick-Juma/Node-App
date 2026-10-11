const DEMO_USERS = new Set(
  (process.env.DEMO_USER_IDS || "demo").split(",").map((s) => s.trim())
);

export function isDemoUser(userId) {
  return DEMO_USERS.has(String(userId));
}
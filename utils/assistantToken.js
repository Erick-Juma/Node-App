import crypto from "crypto";

export function createAssistantToken(uid, platform, ttlSeconds = 8 * 60 * 60) {
  const key = process.env.ASSISTANT_KEY;
  console.log(key);
  if (!key) throw new Error("ASSISTANT_KEY is not set");

  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = crypto
    .createHmac("sha256", key)
    .update(`${uid}.${platform}.${exp}`)
    .digest("hex");

  return `${uid}.${platform}.${exp}.${sig}`;
}
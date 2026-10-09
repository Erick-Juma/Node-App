// middleware/verifyAssistantToken.js
import crypto from "node:crypto";

function verifyToken(token) {
  const key = process.env.ASSISTANT_KEY;
  if (!key) {
    console.error("ASSISTANT_KEY is not set");
    return null;
  }

  const [uid, platform, exp, sig, extra] = String(token || "").split(".");
  if (!uid || !platform || !exp || !sig || extra !== undefined) return null;
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return null;

  const expected = crypto
    .createHmac("sha256", key)
    .update(`${uid}.${platform}.${exp}`)
    .digest("hex");

  const ok =
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

  return ok ? { uid, platform } : null;
}

export function verifyAssistantToken(req, res, next) {
  const claims = verifyToken(req.get("X-Assistant-Token"));
  if (!claims) {
    return res.status(401).json({ error: "Your session has expired. Please refresh the page and try again." });
  }
  req.userId = claims.uid;
  req.platform = claims.platform; // trusted: covered by the signature
  next();
}
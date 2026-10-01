// middleware/verifyAssistantToken.js
import crypto from "node:crypto";

function verifyToken(token) {
  const [uid, exp, sig] = String(token || "").split(".");
  if (!uid || !exp || !sig || Number(exp) < Date.now() / 1000) return null;

  const expected = crypto
    .createHmac("sha256", process.env.ASSISTANT_KEY)
    .update(`${uid}.${exp}`)
    .digest("hex");

  const ok =
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

  return ok ? uid : null;
}

export function verifyAssistantToken(req, res, next) {
  const userId = verifyToken(req.get("X-Assistant-Token"));
//   console.log("User ID from token:", userId); // Log the user ID for debugging
  if (!userId) {
    return res.status(401).json({ error: "Your session has expired. Please refresh the page and try again." });
  }
  req.userId = userId;
  next();
}
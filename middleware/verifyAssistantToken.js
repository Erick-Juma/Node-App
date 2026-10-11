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

const EXPIRED = { error: "Your session has expired. Please refresh the page and try again." };

// Required: used by the platform assistant
export function verifyAssistantToken(req, res, next) {
  const claims = verifyToken(req.get("X-Assistant-Token"));
  if (!claims) return res.status(401).json(EXPIRED);
  req.userId = claims.uid;
  req.platform = claims.platform; // trusted: covered by the signature
  next();
}

// Optional: verifies a token if one is sent; without one, only rejects
// when the route's own flag (e.g. ASK_AI_ENFORCE_TOKEN=true) is on.
export function optionalAssistantToken(enforceFlag, { warn = false } = {}) {
  return (req, res, next) => {
    const token = req.get("X-Assistant-Token");

    if (token) {
      const claims = verifyToken(token);
      if (!claims) return res.status(401).json(EXPIRED);   // a bad token is always rejected
      req.userId = claims.uid;
      req.platform = claims.platform;
      return next();
    }

    if (enforceFlag && process.env[enforceFlag] === "true") {
      return res.status(401).json(EXPIRED);
    }

    if (warn) console.warn(`No assistant token on ${req.method} ${req.originalUrl}`);
    next();
  };
}
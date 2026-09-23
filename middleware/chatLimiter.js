import rateLimit from "express-rate-limit";

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // requests per session per window
  keyGenerator: (req) => req.sessionID,
  message: { error: "Too many requests from your session. Please slow down." },
  statusCode: 429,
});
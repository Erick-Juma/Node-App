import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Per session: protects against one learner hammering the button
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.sessionID || ipKeyGenerator(req.ip),
  message: { error: "Too many requests from your session. Please slow down." },
  statusCode: 429,
});

// Per IP, per minute: scripts can't dodge this by dropping cookies
export const ipMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,                       // allows several learners behind one office IP
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: "Too many requests. Please try again shortly." },
  statusCode: 429,
});

// Per IP, per day: caps total abuse from any one source
export const ipDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 500,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: "Daily request limit reached. Please try again tomorrow." },
  statusCode: 429,
});
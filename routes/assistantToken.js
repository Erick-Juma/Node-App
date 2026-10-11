import express from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { createAssistantToken } from "../utils/assistantToken.js";

const router = express.Router();

const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  limit: 30,                  // 30 tokens per IP per hour
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

router.get("/assistant-token", demoLimiter, (req, res) => {
  // Demo only: off unless DEMO_ASSISTANT=true, and never in production
  if (process.env.DEMO_ASSISTANT !== "true") {
    return res.status(404).end();
  }

  res.set("Cache-Control", "no-store");
  res.json({
    token: createAssistantToken("demo", "aki", 30 * 60), // valid 30 minutes
  });
});

export default router;
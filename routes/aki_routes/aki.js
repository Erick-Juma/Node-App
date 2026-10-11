// routes/aki_routes/aki.js
import express from 'express';
import generateOllamaContent from './ollamaHandler.js';
import generateContent from './akiHandler.js';
import { chatLimiter, ipMinuteLimiter, ipDailyLimiter } from '../../middleware/chatLimiter.js';
import { optionalAssistantToken } from "../../middleware/verifyAssistantToken.js";

const router = express.Router();

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';

const providers = {
    ollama: generateOllamaContent,
    gemini: generateContent,
};

const handler = providers[LLM_PROVIDER];

if (!handler) {
    throw new Error(
        `Unknown LLM_PROVIDER "${LLM_PROVIDER}". Expected one of: ${Object.keys(providers).join(', ')}`
    );
}

// Token check in "soft" mode until the live app sends X-Assistant-Token.
// Set ASK_AI_ENFORCE_TOKEN=true to require it.

router.post(
    '/chat/aki',
    ipDailyLimiter,         // cap per IP per day
    ipMinuteLimiter,        // cap per IP per minute
    optionalAssistantToken("ASK_AI_ENFORCE_TOKEN", { warn: true }),
    chatLimiter,            // cap per session per minute
    handler
);

export default router;
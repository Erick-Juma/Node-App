// routes/aki_routes/aki.js
import express from 'express';
import generateOllamaContent from './ollamaHandler.js';
import generateContent from './akiHandler.js';
import { chatLimiter, ipMinuteLimiter, ipDailyLimiter } from '../../middleware/chatLimiter.js';
import { verifyAssistantToken } from '../../middleware/verifyAssistantToken.js';

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
const ENFORCE_TOKEN = process.env.ASK_AI_ENFORCE_TOKEN === 'true';

function optionalAssistantToken(req, res, next) {
    if (req.get('X-Assistant-Token')) return verifyAssistantToken(req, res, next);
    if (ENFORCE_TOKEN) {
        return res.status(401).json({ error: 'Your session has expired. Please refresh the page and try again.' });
    }
    console.warn('Ask AI request without token from', req.get('origin') || req.ip);
    next();
}

router.post(
    '/chat/aki',
    ipDailyLimiter,         // cap per IP per day
    ipMinuteLimiter,        // cap per IP per minute
    optionalAssistantToken, // verify if present; enforce later
    chatLimiter,            // cap per session per minute
    handler
);

export default router;
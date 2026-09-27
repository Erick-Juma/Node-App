// routes/aki_routes/aki.js
import express from 'express';
import generateOllamaContent from './ollamaHandler.js';
import generateContent from './akiHandler.js';
import { chatLimiter } from '../../middleware/chatLimiter.js';

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

router.post('/chat/aki', chatLimiter, handler);

export default router;
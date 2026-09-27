// routes/aki_routes/aki.js
import express from 'express';
import generateOllamaContent from './ollamaHandler.js';
import generateContent from './akiHandler.js';
import { chatLimiter } from '../../middleware/chatLimiter.js';

const router = express.Router();

// Apply rate limiter to /chat/aki route
router.post('/chat/aki', chatLimiter, generateOllamaContent);

// Export router as default (required for ESM import)
export default router;

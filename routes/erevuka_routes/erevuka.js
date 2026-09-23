import express from 'express'
import generateContent from './erevukaHandler.js';
import { chatLimiter } from '../../middleware/chatLimiter.js';

const router = express.Router();

// Apply rate limiter to the /chat/erevuka route
router.post('/chat/erevuka', chatLimiter, generateContent);

// Export router as default (required for ESM import)
export default router;
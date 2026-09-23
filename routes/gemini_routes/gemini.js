import express from "express";
import { generateContent } from "./geminiHandler.js"; // named import
import { chatLimiter } from "../../middleware/chatLimiter.js";

const router = express.Router();

// Define the route
router.post("/chat/gemini", chatLimiter, generateContent);

export default router;

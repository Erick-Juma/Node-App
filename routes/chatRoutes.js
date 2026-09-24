import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

import {
  getChatLogs,
  getChatLogByPlatform,
  createChatLog,
} from '../controllers/chatLogController.js';

const router = express.Router();
// console.log(process.env.APP_HMAC_KEY);
export const verifyRequest = (req, res, next) => {
  const internalKey = req.headers["x-internal-key"];
  const authHeader = req.headers.authorization;

//   console.log(internalKey, process.env.INTERNAL_API_KEY);
  //  Internal requests
  if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
    req.authSource = "internal";
    return next();
  }

  // JWT external requests
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.APP_HMAC_KEY);
      req.authSource = decoded.app || "external";
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }

  //  Unauthorized
  return res.status(401).json({ message: "Unauthorized" });
};
//Routes to perform chatlogs crud operations
router.get('/chatLogs', verifyRequest, getChatLogs);
router.get('/chatLogs/:id', verifyRequest, getChatLogByPlatform);
router.post('/chatLogs', createChatLog);

export default router;


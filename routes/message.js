import express from "express";
import { createChatLog } from "../models/chatLogModel.js";

const router = express.Router();

// === POST /api/saveMessage ===
router.post("/saveMessage", async (req, res) => {
  const { message, platform, username } = req.body;
  const sender = req.sessionID;

  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (ip === "::1" || ip === "::ffff:127.0.0.1") ip = "127.0.0.1";

  if (!message || !sender) {
    return res.status(400).json({ message: "Message and sender are required." });
  }

  try {
    const newLog = await createChatLog(message, username, platform, ip);

    return res.status(200).json({
      message: "Message saved successfully",
      data: newLog,
    });
  } catch (err) {
    console.error("Error saving message:", err);
    return res.status(500).json({ message: "Error saving message to database" });
  }
});

export default router;
// routes/erevuka_routes/erevukaAssistant.js
import express from "express";
import rateLimit from "express-rate-limit";
import { db } from "../../config/db.js";
import { getEmbedding } from "../../services/embeddings.js";
import { generateAnswer } from "../../services/llm.js";
import { chatLimiter } from "../../middleware/chatLimiter.js";

const router = express.Router();
const PROJECT = "erevuka";

router.post("/chat/erevuka-assistant", chatLimiter, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const queryEmbedding = await getEmbedding(message);

    const { rows: matches } = await db.query(
      `SELECT chunk_text, 1 - (embedding <=> $1) AS similarity
       FROM knowledge_chunks
       WHERE project = $2
       ORDER BY embedding <=> $1
       LIMIT 5`,
      [JSON.stringify(queryEmbedding), PROJECT]
    );

    const context = matches.map((m) => m.chunk_text).join("\n\n");

    const systemPrompt = `You are an assistant that answers questions about the ${PROJECT} project, using only the provided context. If the context doesn't contain the answer, say you don't have enough information — do not make things up.`;

    const answer = await generateAnswer({ systemPrompt, context, question: message });

    return res.status(200).json({ response: answer });
  } catch (err) {
    console.error("Error in project assistant:", err);
    return res.status(500).json({ error: "Error generating response" });
  }
});

export default router;
// routes/erevuka_routes/erevukaAssistant.js
import express from "express";
import { db } from "../../config/db.js";
import { getEmbedding } from "../../services/embeddings.js";
import { generateAnswer } from "../../services/llm.js";
import { chatLimiter } from "../../middleware/chatLimiter.js";

const router = express.Router();

const MSG_URL = `${process.env.APP_URL}/api/saveMessage`;

router.post("/chat/erevuka-assistant", chatLimiter, async (req, res) => {

  const { prompt, aiConfigs } = req.body;
  const { platform, username } = aiConfigs || {};

  if (!prompt) {
    return res.status(400).json({
      error: "prompt is required."
    });
  }

  try {
    // Save message
    const response = await fetch(MSG_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: prompt,
        platform,
        username
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));

      throw new Error(
        data.error || `Server returned ${response.status}`
      );
    }

    const data = await response.json();

    console.log("Message saved successfully:", data);

    // Generate embedding
    const queryEmbedding = await getEmbedding(prompt);

    // Search knowledge base
    const { rows: matches } = await db.query(
      `SELECT
                chunk_text,
                1 - (embedding <=> $1) AS similarity
             FROM knowledge_chunks
             WHERE project = $2
             ORDER BY embedding <=> $1
             LIMIT 5`,
      [JSON.stringify(queryEmbedding), platform]
    );

    const context = matches
      .map(m => m.chunk_text)
      .join("\n\n");

    const systemPrompt = `
You are an assistant that answers questions about the ${platform} project,
using only the provided context.

If the context doesn't contain the answer, say you don't have enough
information. Do not make things up.
`;

    const answer = await generateAnswer({
      systemPrompt,
      context,
      question: prompt
    });

    return res.status(200).json({
      response: answer
    });

  } catch (err) {
    console.error("Error in project assistant:", err);

    const status = err.status || err.code;

    // Gemini quota / rate limit
    if (
      status === 429 ||
      err.message?.includes("RESOURCE_EXHAUSTED")
    ) {
      return res.status(429).json({
        error: "The AI service has temporarily reached its request limit. Please try again shortly."
      });
    }

    // Gemini temporarily unavailable
    if (status === 503) {
      return res.status(503).json({
        error: "The AI service is temporarily unavailable. Please try again shortly."
      });
    }

    return res.status(500).json({
      error: "Error generating response"
    });
  }
});

export default router;
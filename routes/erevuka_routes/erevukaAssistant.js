// routes/erevuka_routes/erevukaAssistant.js
import express from "express";
import { db } from "../../config/db.js";
import { generateEmbedding } from "../../services/embedding/index.js";
import { generateAnswer } from "../../services/llm/index.js";
import { chatLimiter } from "../../middleware/chatLimiter.js";

const router = express.Router();

let PROJECT = null;

const MSG_URL = `${process.env.APP_URL}/api/saveMessage`;

router.post("/chat/erevuka-assistant", chatLimiter, async (req, res) => {

  const { prompt, aiConfigs } = req.body;
  const { platform, username } = aiConfigs || {};

  if (platform ==="chat application"){
    PROJECT = "aki";
  }
  else {
    PROJECT = platform;
  }

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
    const embeddingStart = Date.now();

    const queryEmbedding = await generateEmbedding(prompt);

    console.log(
      `Embedding: ${Date.now() - embeddingStart}ms`
    );

    const dbStart = Date.now();

    const { rows: matches } = await db.query(
      `SELECT
        id,
        article_id,
        chunk_text,
        project,
        1 - (embedding <=> $1) AS similarity
    FROM knowledge_chunks
    WHERE project = $2
    ORDER BY embedding <=> $1
    LIMIT 5`,
      [JSON.stringify(queryEmbedding), PROJECT]
    );

    console.log(
      `PostgreSQL: ${Date.now() - dbStart}ms`
    );


    const context = matches
      .map(m => m.chunk_text)
      .join("\n\n");

    console.log("RAG matches:", matches);


    const systemPrompt = `
You are a customer support assistant for Erevuka.

Answer using ONLY the provided context.
Be clear and concise. You may rephrase the context.
Do not guess or add unsupported information.
If the context does not contain the answer, say:
"I don't have enough information to answer that."

Context:
${context}
`;



    const answer = await generateAnswer({
      systemPrompt,
      context,
      question: prompt
    });
    console.log(`Total: ${Date.now() - dbStart}ms`);

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
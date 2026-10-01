// routes/erevuka_routes/erevukaAssistant.js
import express from "express";
import { db } from "../../config/db.js";
import { generateEmbedding } from "../../services/embedding/index.js";
import { generateAnswer } from "../../services/llm/index.js";
import { chatLimiter } from "../../middleware/chatLimiter.js";
import { verifyAssistantToken } from "../../middleware/verifyAssistantToken.js";

const router = express.Router();

let PROJECT = null;
let TOPIC = null;

const MSG_URL = `${process.env.APP_URL}/api/saveMessage`;

router.post("/chat/erevuka-assistant", verifyAssistantToken, chatLimiter, async (req, res) => {

  const { prompt, aiConfigs, topic } = req.body;
  const { platform } = aiConfigs || {};

  const username = req.userId;

  console.log(username);

  if (platform ==="chat application"){
    PROJECT = "aki";
  }
  else {
    PROJECT = platform;
    TOPIC = topic;
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


const MIN_SIMILARITY = 0.55; // your hits scored 0.87, a miss scored 0.34; tune as you add content
const STRONG_SIMILARITY = 0.75; // tune with your Gemini scores

const TOPIC = req.body.topic ? String(req.body.topic) : null;

console.log(TOPIC);

const SEARCH_SQL = `
  SELECT id, article_id, chunk_text, project, topic,
         1 - (embedding <=> $1) AS similarity
    FROM knowledge_chunks
   WHERE project = $2
     AND ($3::text IS NULL OR topic = $3::text)
   ORDER BY embedding <=> $1
   LIMIT 5`;

  const vec = JSON.stringify(queryEmbedding);
  const dbStart = Date.now();

  const { rows: matches } = await db.query(SEARCH_SQL, [vec, PROJECT, TOPIC]);
  let relevant = matches.filter((m) => Number(m.similarity) >= MIN_SIMILARITY);
  let fromTopic = null;

  matches.map((m) => ({
    id: m.id,
    article_id: m.article_id,
    topic: m.topic,
    similarity: Number(m.similarity).toFixed(3),
  }))

  if (relevant.length === 0 && TOPIC) {
    const { rows: all } = await db.query(SEARCH_SQL, [vec, PROJECT, null]);
    const best = all[0];
    const bestSim = best ? Number(best.similarity) : 0;

    if (bestSim >= STRONG_SIMILARITY) {
      // confident: answer from the other topic
      relevant = all.filter((m) => Number(m.similarity) >= MIN_SIMILARITY);
      fromTopic = best.topic;
    } else if (bestSim >= MIN_SIMILARITY) {
      // borderline: let the user decide
      return res.json({
        response: "That doesn't look like it's in the selected topic, but it may be covered in another one.",
        suggestTopic: best.topic,
      });
    }
  }

  if (relevant.length === 0) {
    return res.json({
      response:
        "I don't have enough information to answer that. Try rephrasing your question, or choose All topics.",
    });
  }

  // console.log("fromTopic:", fromTopic, "TOPIC:", TOPIC);

  const context = relevant.map((m) => m.chunk_text).join("\n\n");

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
      response: answer,
      fromTopic,
    });

  } catch (err) {
    // console.error("Error in project assistant:", err);

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
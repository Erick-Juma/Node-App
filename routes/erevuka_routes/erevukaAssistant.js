// routes/erevuka_routes/erevukaAssistant.js
import express from "express";
import { db } from "../../config/db.js";
import { generateEmbedding } from "../../services/embedding/index.js";
import { generateAnswer } from "../../services/llm/index.js";
import { chatLimiter } from "../../middleware/chatLimiter.js";
import { verifyAssistantToken } from "../../middleware/verifyAssistantToken.js";

const router = express.Router();

const MSG_URL = `${process.env.APP_URL}/api/saveMessage`;

const MIN_SIMILARITY = 0.55;    // re-tune: question rows score higher than content chunks did
const STRONG_SIMILARITY = 0.75;
const MARGIN = 0.05;            // how much better another topic must score to win
const MAX_ARTICLES = 3;

// Search every chunk (content + questions), keep each article's best score,
// then return only that article's content chunks for the LLM.
const SEARCH_SQL = `
  WITH hits AS (
    SELECT article_id, 1 - (embedding <=> $1::vector) AS similarity
      FROM knowledge_chunks
     WHERE project = $2
       AND ($3::text IS NULL OR topic = $3::text)
     ORDER BY embedding <=> $1::vector
     LIMIT 20
  ),
  best AS (
    SELECT article_id, MAX(similarity) AS similarity
      FROM hits
     GROUP BY article_id
     ORDER BY similarity DESC
     LIMIT ${MAX_ARTICLES}
  )
  SELECT a.id AS article_id, a.title, a.topic, b.similarity,
         string_agg(c.chunk_text, ' ' ORDER BY c.chunk_index) AS content
    FROM best b
    JOIN knowledge_articles a ON a.id = b.article_id
    JOIN knowledge_chunks c ON c.article_id = b.article_id AND c.kind = 'content'
   GROUP BY a.id, a.title, a.topic, b.similarity
   ORDER BY b.similarity DESC`;

router.post("/chat/erevuka-assistant", verifyAssistantToken, chatLimiter, async (req, res) => {
  console.log("assistant body:", JSON.stringify(req.body));
  const { prompt, topic } = req.body;
  const platform = req.platform; // from the signed token, not the request body
  const username = req.userId;

  if (!prompt) {
    return res.status(400).json({ error: "prompt is required." });
  }

  // Per-request, never module-level: concurrent requests must not share these
  const project = platform === "chat application" ? "aki" : platform;
  const topicFilter = topic ? String(topic) : null; // topic id from the widget, or null = all topics

  if (!project) {
    return res.status(400).json({ error: "platform is required." });
  }

  try {
    // Save message
    const response = await fetch(MSG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, platform, username }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Server returned ${response.status}`);
    }

    // Embed the question the same way the phrasings were embedded
    const queryEmbedding = await generateEmbedding(prompt, "RETRIEVAL_QUERY");
    const vec = JSON.stringify(queryEmbedding);
    const dbStart = Date.now();

    // Search the selected topic and all topics in parallel
    const [{ rows: inTopic }, { rows: all }] = await Promise.all([
      topicFilter ? db.query(SEARCH_SQL, [vec, project, topicFilter]) : Promise.resolve({ rows: [] }),
      db.query(SEARCH_SQL, [vec, project, null]),
    ]);

    // Debug: what each search found (remove once thresholds are tuned)
    const fmt = (rows) => rows.map((m) => [m.title, m.topic, Number(m.similarity).toFixed(3)]);
    console.log("topic:", topicFilter, "| in-topic:", fmt(inTopic), "| all:", fmt(all));

    const bestIn = inTopic[0] ? Number(inTopic[0].similarity) : 0;
    const bestAll = all[0] ? Number(all[0].similarity) : 0;

    let relevant;
    let fromTopic = null;

    if (!topicFilter) {
      // "All topics" selected
      relevant = all.filter((m) => Number(m.similarity) >= MIN_SIMILARITY);
    } else if (
      all[0] &&
      String(all[0].topic) !== topicFilter &&
      bestAll >= STRONG_SIMILARITY &&
      bestAll - bestIn >= MARGIN
    ) {
      // Another topic has a clearly better, confident match: answer from it
      relevant = all.filter((m) => Number(m.similarity) >= MIN_SIMILARITY);
      fromTopic = all[0].topic;
    } else {
      const inRelevant = inTopic.filter((m) => Number(m.similarity) >= MIN_SIMILARITY);

      // Other-topic articles scoring about as well as the best in-topic one:
      // the score can't separate them, so let the LLM choose
      const nearTies = inRelevant.length
        ? all.filter(
            (m) =>
              String(m.topic) !== topicFilter &&
              Number(m.similarity) >= MIN_SIMILARITY &&
              Number(m.similarity) >= bestIn - MARGIN
          )
        : [];

        relevant = [...inRelevant, ...nearTies]
          .sort((a, b) => Number(b.similarity) - Number(a.similarity))
          .slice(0, MAX_ARTICLES);

      if (relevant.length === 0 && bestAll >= MIN_SIMILARITY) {
        // Nothing usable in this topic, borderline match elsewhere: let the user decide
        return res.json({
          response: "That doesn't look like it's in the selected topic, but it may be covered in another one.",
          suggestTopic: all[0].topic,
        });
      }
    }

    if (relevant.length === 0) {
      return res.json({
        response: "I don't have enough information to answer that. Try rephrasing your question, or choose All topics.",
      });
    }

    // One block per article, titled, so the model sees which Q&A each answer belongs to
    const context = relevant.map((m) => `### ${m.title}\n${m.content}`).join("\n\n");

    const systemPrompt = `
  You are a customer support assistant for ${project}.

  Terminology: "module" usually means a course, so treat a question about modules
  as a question about courses. Inside a course, sections may also be named
  "Module 1", "Module 2" and so on; if the question mentions a numbered module
  or a locked section, it is about a section within a course.
  "Compulsory modules" and "required modules" mean the same as mandatory modules.
  There are two kinds of certificate: a course certificate for each completed course,
  and an overall certificate for all mandatory modules. If a question about a
  certificate doesn't make clear which one, briefly cover both.

  Answer using ONLY the provided context.
  Be clear and concise. You may rephrase the context.
  Do not guess or add unsupported information.
  If the context does not contain the answer, say:
  "I don't have enough information to answer that."

  Format the answer as plain text. Simple numbered or dash lists are fine,
  but do not use Markdown such as **bold**, headings or links.

  Context:
  ${context}
  `;
  
    const answer = await generateAnswer({ systemPrompt, context, question: prompt });
    console.log(`Total: ${Date.now() - dbStart}ms`);

    return res.status(200).json({ response: answer, fromTopic });
  } catch (err) {
    const status = err.status || err.code;

    if (status === 429 || err.message?.includes("RESOURCE_EXHAUSTED")) {
      return res.status(429).json({
        error: "The AI service has temporarily reached its request limit. Please try again shortly.",
      });
    }

    if (status === 503) {
      return res.status(503).json({
        error: "The AI service is temporarily unavailable. Please try again shortly.",
      });
    }

    console.error("Error in erevuka assistant:", err);
    return res.status(500).json({ error: "Error generating response" });
  }
});

export default router;
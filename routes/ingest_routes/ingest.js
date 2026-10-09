// routes/ingest_routes/ingest.js
import express from "express";
import { ingestArticle } from "../../services/ingestion.js";

const router = express.Router();

function requireIngestKey(req, res, next) {
  if (req.header("X-Ingest-Key") !== process.env.INGEST_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.post("/ingest/article", requireIngestKey, async (req, res) => {
  // Laravel sends snake_case
  const { id, title, body, topic, topic_title, alternate_phrasings, project } = req.body;

  if (!id || !title || !body || !project || !topic) {
    return res.status(400).json({ error: "id, title, topic, body, and project are required." });
  }

  const phrasings = Array.isArray(alternate_phrasings)
    ? alternate_phrasings
      .filter((p) => typeof p === "string")
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 25)
    : [];

  try {
    // ingestArticle expects camelCase: map explicitly, never shorthand
    const result = await ingestArticle({
      id,
      title,
      body,
      topic,
      topicTitle: topic_title || null,
      alternatePhrasings: phrasings,
      project,
    });
    console.log("ingest result:", id, result);
    return res.status(200).json({ message: "Article ingested", ...result });
  } catch (err) {
    console.error("Error ingesting article:", err);
    return res.status(500).json({ error: "Failed to ingest article" });
  }
});

export default router;

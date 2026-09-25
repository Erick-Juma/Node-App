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
  const { id, title, body, project } = req.body;

  if (!id || !title || !body || !project) {
    return res.status(400).json({ error: "id, title, body, and project are required." });
  }

  try {
    const result = await ingestArticle({ id, title, body, project });
    return res.status(200).json({ message: "Article ingested", ...result });
  } catch (err) {
    console.error("Error ingesting article:", err);
    return res.status(500).json({ error: "Failed to ingest article" });
  }
});

export default router;
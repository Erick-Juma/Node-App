// services/ingestion.js
import crypto from "node:crypto";
import { db } from "../config/db.js";
import { generateEmbedding } from "../services/embedding/index.js";

const MODEL_TAG = `${process.env.EMBEDDING_PROVIDER || "ollama"}/${process.env.EMBEDDING_MODEL || "nomic-embed-text"}`;
const EMBED_BATCH = 5; // concurrent embedding calls
const MAX_CHUNK = 800;
// Bump when you change chunking or stripHtml so everything re-ingests
const PIPELINE_VERSION = "v1";

function stripHtml(html) {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hardSplit(s, max) {
  const parts = [];
  for (let i = 0; i < s.length; i += max) parts.push(s.slice(i, i + max));
  return parts;
}

function chunkText(text, maxLength = MAX_CHUNK) {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .filter(Boolean)
    .flatMap((s) => (s.length > maxLength ? hardSplit(s, maxLength) : [s]));

  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if (current && current.length + 1 + s.length > maxLength) {
      chunks.push(current);
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function hashContent(title, cleanBody) {
  return crypto
    .createHash("sha256")
    .update([PIPELINE_VERSION, MODEL_TAG, title, cleanBody].join("\u0000"))
    .digest("hex");
}

export async function ingestArticle({ id, title, body, project }, { force = false } = {}) {
  const sourceUrl = `laravel-article-${id}`;
  const cleanBody = stripHtml(body || "");
  const contentHash = hashContent(title, cleanBody);

  // 1. Skip if nothing changed (same text, model and pipeline version)
  if (!force) {
    const { rows } = await db.query(
      "SELECT id, content_hash FROM knowledge_articles WHERE project = $1 AND source_url = $2",
      [project, sourceUrl]
    );
    if (rows[0]?.content_hash === contentHash) {
      return { articleId: rows[0].id, skipped: true };
    }
  }

  const chunks = chunkText(cleanBody);

  // 2. Embed everything BEFORE touching the database
  const embeddings = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const results = await Promise.all(
      batch.map((c) => generateEmbedding(`${title}\n\n${c}`, "RETRIEVAL_DOCUMENT"))
    );
    embeddings.push(...results);
  }

  // 3. Swap old data for new data atomically
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // ON DELETE CASCADE removes the old chunks too
    await client.query(
      "DELETE FROM knowledge_articles WHERE project = $1 AND source_url = $2",
      [project, sourceUrl]
    );

    const { rows } = await client.query(
      `INSERT INTO knowledge_articles (source_url, title, project, content_hash)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [sourceUrl, title, project, contentHash]
    );
    const articleId = rows[0].id;

    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        `INSERT INTO knowledge_chunks
           (article_id, chunk_index, chunk_text, embedding, project, embedding_model, embedding_dim)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [articleId, i, chunks[i], JSON.stringify(embeddings[i]), project, MODEL_TAG, embeddings[i].length]
      );
    }

    await client.query("COMMIT");
    return { articleId, chunkCount: chunks.length, skipped: false };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
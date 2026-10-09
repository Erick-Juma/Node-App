// services/ingestion.js
import crypto from "node:crypto";
import { db } from "../config/db.js";
import { generateEmbedding } from "../services/embedding/index.js";

const MODEL_TAG = `${process.env.EMBEDDING_PROVIDER || "ollama"}/${process.env.EMBEDDING_MODEL || "ollama"}`;
const EMBED_BATCH = 5; // concurrent embedding calls
const MAX_CHUNK = 800;
// Bump when you change chunking, stripHtml or what gets embedded so everything re-ingests
const PIPELINE_VERSION = "v2"; // v2: question rows (title + alternate phrasings)

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

// Title + alternate phrasings, trimmed and de-duplicated (case-insensitive)
function buildQuestions(title, alternatePhrasings = []) {
  const seen = new Set();
  const out = [];
  for (const q of [title, ...alternatePhrasings]) {
    const clean = stripHtml(String(q || ""));
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }
  return out;
}

function hashContent(title, cleanBody, questions) {
  return crypto
    .createHash("sha256")
    .update([PIPELINE_VERSION, MODEL_TAG, title, cleanBody, ...questions].join("\u0000"))
    .digest("hex");
}

async function embedAll(texts, taskType) {
  const out = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    out.push(...(await Promise.all(batch.map((t) => generateEmbedding(t, taskType)))));
  }
  return out;
}

export async function ingestArticle(
  { id, title, body, topic, alternatePhrasings = [], project },
  { force = false } = {}
) {
  const sourceUrl = `laravel-article-${id}`;
  const cleanBody = stripHtml(body || "");
  const questions = buildQuestions(title, alternatePhrasings);
  const contentHash = hashContent(title, cleanBody, questions);

  // Store the topic id: the widget filters and suggests topics by id
  const topicValue = topic != null ? String(topic) : null;

  // 1. Skip if nothing changed (same text, phrasings, model and pipeline version)
  if (!force) {
    const { rows } = await db.query(
      "SELECT id, content_hash, topic FROM knowledge_articles WHERE project = $1 AND source_url = $2",
      [project, sourceUrl]
    );
    const existing = rows[0];
    if (existing?.content_hash === contentHash) {
      if ((existing.topic ?? null) !== topicValue) {
        await db.query("UPDATE knowledge_articles SET topic = $1 WHERE id = $2", [topicValue, existing.id]);
        await db.query("UPDATE knowledge_chunks SET topic = $1 WHERE article_id = $2", [topicValue, existing.id]);
      }
      return { articleId: existing.id, skipped: true };
    }
  }

  const chunks = chunkText(cleanBody);

  // 2. Embed everything BEFORE touching the database
  const chunkEmbeddings = await embedAll(
    chunks.map((c) => `${title}\n\n${c}`),
    "RETRIEVAL_DOCUMENT"
  );
  // Phrasings are matched against user questions, so embed them the same way queries are
  const questionEmbeddings = await embedAll(questions, "RETRIEVAL_QUERY");

  // 3. Swap old data for new data atomically
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Serialise concurrent ingests of the same article (released on COMMIT/ROLLBACK)
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${project}:${sourceUrl}`]);

    // ON DELETE CASCADE removes the old chunks too
    await client.query(
      "DELETE FROM knowledge_articles WHERE project = $1 AND source_url = $2",
      [project, sourceUrl]
    );

    const { rows } = await client.query(
      `INSERT INTO knowledge_articles (source_url, title, project, content_hash, topic)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [sourceUrl, title, project, contentHash, topicValue]
    );
    const articleId = rows[0].id;

    const insertChunk = (index, text, embedding, kind) =>
      client.query(
        `INSERT INTO knowledge_chunks
           (article_id, chunk_index, chunk_text, embedding, project, embedding_model, embedding_dim, topic, kind)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [articleId, index, text, JSON.stringify(embedding), project, MODEL_TAG, embedding.length, topicValue, kind]
      );

    for (let i = 0; i < chunks.length; i++) {
      await insertChunk(i, chunks[i], chunkEmbeddings[i], "content");
    }
    for (let i = 0; i < questions.length; i++) {
      await insertChunk(null, questions[i], questionEmbeddings[i], "question");
    }

    await client.query("COMMIT");
    return { articleId, chunkCount: chunks.length, questionCount: questions.length, skipped: false };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
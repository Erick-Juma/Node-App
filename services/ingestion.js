// services/ingestion.js
import { db } from "../config/db.js";
import { getEmbedding } from "./embeddings.js";

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function chunkText(text, maxLength = 800) {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence + " ";
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function ingestArticle({ id, title, body, project }) {
  const sourceUrl = `laravel-article-${id}`;

  await db.query(
    `DELETE FROM knowledge_chunks WHERE article_id = (
       SELECT id FROM knowledge_articles WHERE source_url = $1
     )`,
    [sourceUrl]
  );
  await db.query(`DELETE FROM knowledge_articles WHERE source_url = $1`, [sourceUrl]);

  const { rows } = await db.query(
    "INSERT INTO knowledge_articles (source_url, title, project) VALUES ($1, $2, $3) RETURNING id",
    [sourceUrl, title, project]
  );
  const articleId = rows[0].id;

  const cleanBody = stripHtml(body);
  const chunks = chunkText(cleanBody);

  for (const chunk of chunks) {
    const contextualChunk = `${title}\n\n${chunk}`;
    const embedding = await getEmbedding(contextualChunk, "RETRIEVAL_DOCUMENT");

    await db.query(
      "INSERT INTO knowledge_chunks (article_id, chunk_text, embedding, project) VALUES ($1, $2, $3, $4)",
      [articleId, chunk, JSON.stringify(embedding), project]
    );
  }

  return { articleId, chunkCount: chunks.length };
}
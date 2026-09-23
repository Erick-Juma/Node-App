// scripts/ingestArticles.js
import { db } from "../config/db.js";
import { getEmbedding } from "../services/embeddings.js";

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

export async function ingestArticle({ url, title, content, domain }) {
  const { rows } = await db.query(
    "INSERT INTO knowledge_articles (source_url, title, domain) VALUES ($1, $2, $3) RETURNING id",
    [url, title, project]
  );
  const articleId = rows[0].id;

  const chunks = chunkText(content);

  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk);
    await db.query(
      "INSERT INTO knowledge_chunks (article_id, chunk_text, embedding, project) VALUES ($1, $2, $3, $4)",
      [articleId, chunk, JSON.stringify(embedding), project]
    );
  }

  return { articleId, chunkCount: chunks.length };
}
// scripts/ingestArticles.js
import { db } from "../config/db.js";
import { getEmbedding } from "../services/embeddings.js";

const LARAVEL_API_URL = process.env.LARAVEL_ARTICLES_URL; // e.g. https://erevuka.com/api/articles
const INGEST_KEY = process.env.INGEST_API_KEY;
const PROJECT = "erevuka";

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

async function fetchAllArticles() {
  let page = 1;
  let articles = [];

  while (true) {
    const res = await fetch(`${LARAVEL_API_URL}?page=${page}&per_page=100`, {
      headers: { "X-Ingest-Key": INGEST_KEY },
    });

    if (!res.ok) {
      throw new Error(`Laravel API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    articles = articles.concat(data.data);

    if (!data.next_page_url) break;
    page++;
  }

  return articles;
}

async function ingestArticle({ id, title, body }) {
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
    [sourceUrl, title, PROJECT]
  );
  const articleId = rows[0].id;

  const cleanBody = stripHtml(body);
  const chunks = chunkText(cleanBody);

  for (const chunk of chunks) {
    const contextualChunk = `${title}\n\n${chunk}`; // title prepended for embedding
    const embedding = await getEmbedding(contextualChunk, "RETRIEVAL_DOCUMENT");

    await db.query(
      "INSERT INTO knowledge_chunks (article_id, chunk_text, embedding, project) VALUES ($1, $2, $3, $4)",
      [articleId, chunk, JSON.stringify(embedding), PROJECT] // store the clean chunk, not the title-prefixed version
    );
  }

  return { articleId, chunkCount: chunks.length };
}

async function run() {
  console.log("Fetching articles from Laravel...");
  const articles = await fetchAllArticles();
  console.log(`Fetched ${articles.length} articles.`);

  for (const article of articles) {
    try {
      const result = await ingestArticle(article);
      console.log(`Ingested "${article.title}" — ${result.chunkCount} chunks`);
    } catch (err) {
      console.error(`Failed to ingest "${article.title}":`, err.message);
    }
  }

  console.log("Ingestion complete.");
  process.exit(0);
}

run();
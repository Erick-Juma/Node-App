// scripts/ingestArticles.js
import { ingestArticle } from "../services/ingestion.js";

const LARAVEL_API_URL = process.env.LARAVEL_ARTICLES_URL;
const INGEST_KEY = process.env.INGEST_API_KEY;
const PROJECT = "erevuka";

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

async function run() {
  console.log("Fetching articles from Laravel...");
  const articles = await fetchAllArticles();
  console.log(`Fetched ${articles.length} articles.`);

  for (const article of articles) {
    try {
      const result = await ingestArticle({ ...article, project: PROJECT });
      console.log(`Ingested "${article.title}" — ${result.chunkCount} chunks`);
    } catch (err) {
      console.error(`Failed to ingest "${article.title}":`, err.message);
    }
  }

  console.log("Ingestion complete.");
  process.exit(0);
}

run();
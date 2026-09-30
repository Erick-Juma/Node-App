// scripts/ingestArticles.js
import "dotenv/config";
import { ingestArticle } from "../services/ingestion.js";

const LARAVEL_API_URL = process.env.LARAVEL_ARTICLES_URL;
const INGEST_KEY = process.env.INGEST_API_KEY;
const PROJECT = "erevuka";
const force = process.argv.includes("--force");

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
  console.log(`Fetching articles from Laravel...${force ? " (force mode)" : ""}`);
  const articles = await fetchAllArticles();
  console.log(`Fetched ${articles.length} articles.`);

  let done = 0, skipped = 0, failed = 0;

  for (const article of articles) {
    try {
      const result = await ingestArticle({ ...article, project: PROJECT }, { force });
      if (result.skipped) {
        skipped++;
        console.log(`Skipped "${article.title}" (unchanged)`);
      } else {
        done++;
        console.log(`Ingested "${article.title}", ${result.chunkCount} chunks`);
      }
    } catch (err) {
      failed++;
      console.error(`Failed to ingest "${article.title}":`, err.message);
    }
  }

  console.log(`Done. Ingested ${done}, skipped ${skipped}, failed ${failed}.`);
  process.exit(failed ? 1 : 0);
}

run().catch((err) => {
  console.error("Ingestion aborted:", err.message);
  process.exit(1);
});
import { generateEmbedding as generateOllamaEmbedding } from "./ollama.js";
import { generateEmbedding as generateGeminiEmbedding } from "./gemini.js";

const provider = process.env.EMBEDDING_PROVIDER || "ollama";

console.log(`Using embedding provider: ${provider}`);

export async function generateEmbedding(text) {
switch (provider) {
case "ollama":
return generateOllamaEmbedding(text);

case "gemini":
  return generateGeminiEmbedding(text);

default:
  throw new Error(
    `Unsupported embedding provider: ${provider}`
  );


}
}
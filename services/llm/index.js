import { generateAnswer as generateGeminiAnswer } from "./gemini.js";
import { generateAnswer as generateOllamaAnswer } from "./ollama.js";
import { generateAnswer as generateMistralAnswer } from "./mistral.js";

const provider = process.env.ASSISTANT_LLM_PROVIDER || process.env.LLM_PROVIDER || "ollama";

console.log(`Using LLM provider: ${provider}`);

export async function generateAnswer(options) {
  switch (provider) {
    case "gemini":
      return generateGeminiAnswer(options);
    case "ollama":
      return generateOllamaAnswer(options);
    case "mistral":
      return generateMistralAnswer(options);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}
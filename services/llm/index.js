import { generateAnswer as generateGeminiAnswer } from "./gemini.js";
import { generateAnswer as generateOllamaAnswer } from "./ollama.js";

const provider = process.env.LLM_PROVIDER || "ollama";

export async function generateAnswer(options) {
switch (provider) {
case "gemini":
return generateGeminiAnswer(options);

case "ollama":
  return generateOllamaAnswer(options);

default:
  throw new Error(`Unsupported LLM provider: ${provider}`);


}
}
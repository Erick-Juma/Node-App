// services/llm.js
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateAnswer({ systemPrompt, context, question }) {
  const prompt = `${systemPrompt}\n\nContext:\n${context}\n\nQuestion: ${question}\nAssistant:`;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return result.text || "No response found.";
}
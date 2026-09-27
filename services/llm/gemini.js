import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
apiKey: process.env.API_KEY,
});

export async function generateAnswer({
systemPrompt,
context,
question,
}) {
const prompt = `${systemPrompt}

Context:
${context}

Question: ${question}

Answer:`;

const result = await ai.models.generateContent({
model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
contents: prompt,
});

return result.text || "No response found.";
}
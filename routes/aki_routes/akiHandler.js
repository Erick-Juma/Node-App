import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_INPUT_LENGTH = 200;
const MAX_HISTORY_TURNS = 4;       // keep last N user/model exchanges
const MAX_OUTPUT_TOKENS = 512;     // cap how much the model can generate
const MAX_CONTEXT_CHARS = 4000;    // hard cap on total chars sent to the model

export const generateContent = async (req, res) => {
  const { message } = req.body;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  const trimmedMessage = message.trim().slice(0, MAX_INPUT_LENGTH);

  req.session.history ||= [];

  // Trim by turn count first (cheap check)
  if (req.session.history.length > MAX_HISTORY_TURNS * 2) {
    req.session.history = req.session.history.slice(-MAX_HISTORY_TURNS * 2);
  }

  // Then trim by total character budget, dropping oldest turns until it fits.
  // Protects against a few very long messages blowing past a reasonable context size
  // even when turn count is within limits.
  const charCount = (entries) =>
    entries.reduce((sum, e) => sum + (e.parts?.[0]?.text?.length || 0), 0);

  while (
    req.session.history.length > 0 &&
    charCount(req.session.history) + trimmedMessage.length > MAX_CONTEXT_CHARS
  ) {
    req.session.history.shift();
  }

  const contents = [
    ...req.session.history,
    { role: "user", parts: [{ text: trimmedMessage }] },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    });

    const text = response.text || "No response text found.";

    req.session.history.push(
      { role: "user", parts: [{ text: trimmedMessage }] },
      { role: "model", parts: [{ text }] }
    );

    res.json({ response: text });
  } catch (err) {
    console.error("Error generating content:", err);
    res.status(500).json({ error: "Unexpected error occurred." });
  }
};

export default generateContent;
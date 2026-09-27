import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MAX_INPUT_LENGTH = 200;
const MAX_HISTORY_TURNS = 4; // keep last N user/model exchanges

export const generateContent = async (req, res) => {
  const { message } = req.body;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  const trimmedMessage = message.trim().slice(0, MAX_INPUT_LENGTH);

  req.session.history ||= []; // array of { role, parts: [{ text }] }

  // Trim history to last N turns to bound cost/latency and avoid context overflow
  if (req.session.history.length > MAX_HISTORY_TURNS * 2) {
    req.session.history = req.session.history.slice(-MAX_HISTORY_TURNS * 2);
  }

  const contents = [
    ...req.session.history,
    { role: "user", parts: [{ text: trimmedMessage }] },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
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
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MAX_INPUT_LENGTH = 200;

export const generateContent = async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const trimmedMessage = message.slice(0, MAX_INPUT_LENGTH);
  req.session.conversationContext ||= "";

  try {
    req.session.conversationContext += `User: ${trimmedMessage}\n`;
    const prompt = req.session.conversationContext + "Assistant:";

    // use plain string, as per docs
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    // use response.text directly
    const text = response.text || "No response text found.";

    req.session.conversationContext += `Assistant: ${text}\n`;
    res.json({ response: text });

  } catch (err) {
    console.error("Error generating content:", err);
    res.status(500).json({ error: "Unexpected error occurred." });
  }
};


export default generateContent;

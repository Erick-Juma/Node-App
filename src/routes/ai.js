import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MAX_MESSAGES = 20;   // how much history to accept
const MAX_CHARS = 8000;    // per message

// Turn the widget's history + new prompt into Gemini's "contents" format
function buildContents(history, prompt) {
  const past = Array.isArray(history) ? history : [];

  const contents = past
    .filter(m => m && (m.role === 'user' || m.role === 'bot')
                   && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_MESSAGES)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',   // Gemini calls the AI "model"
      parts: [{ text: m.text.slice(0, MAX_CHARS) }],
    }));

  // The conversation must start with a user message
  while (contents.length && contents[0].role === 'model') contents.shift();

  contents.push({ role: 'user', parts: [{ text: prompt }] });
  return contents;
}

router.post('/api/v1/ask', async (req, res) => {
  try {
    const { prompt, history } = req.body;

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildContents(history, prompt),
    });

    res.status(200).json({ response: response.text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to communicate with AI' });
  }
});

export default router;
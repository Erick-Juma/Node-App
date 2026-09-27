import { generateChatResponse } from "../../services/llm/ollamaChat.js";

const MAX_INPUT_LENGTH = 200;
const MAX_HISTORY_MESSAGES = 4;

export const generateOllamaContent = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: "Message is required",
    });
  }

  const trimmedMessage = message.slice(0, MAX_INPUT_LENGTH);

  // Initialize conversation history
  req.session.conversationHistory ||= [];

  try {
    // Add user message
    req.session.conversationHistory.push({
      role: "user",
      content: trimmedMessage,
    });

    // Keep only the most recent 6 messages
    const recentMessages =
      req.session.conversationHistory.slice(-MAX_HISTORY_MESSAGES);

    // Convert messages into a prompt
    const conversation = recentMessages
      .map((message) => {
        const label = message.role === "user"
          ? "User"
          : "Assistant";

        return `${label}: ${message.content}`;
      })
      .join("\n");

    const start = Date.now();

    const text = await generateChatResponse({
      conversation,
    });

    console.log(`Ollama generation: ${Date.now() - start}ms`);

    // Add assistant response
    req.session.conversationHistory.push({
      role: "assistant",
      content: text,
    });

    // Optional: prevent the session from growing indefinitely
    if (req.session.conversationHistory.length > MAX_HISTORY_MESSAGES) {
      req.session.conversationHistory =
        req.session.conversationHistory.slice(-MAX_HISTORY_MESSAGES);
    }

    return res.json({
      response: text,
    });

  } catch (err) {
    console.error("Ollama chat error:", err);

    return res.status(500).json({
      error: "Unexpected error occurred.",
    });
  }
};

export default generateOllamaContent;
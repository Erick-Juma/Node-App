import dotenv from "dotenv";

dotenv.config();

const OLLAMA_URL =
    process.env.OLLAMA_URL || "http://localhost:11434";

const MODEL =
    process.env.OLLAMA_CHAT_MODEL || "gemma3:1b";

export async function generateChatResponse({ conversation }) {

    const prompt = `Answer briefly and directly.

${conversation}
Assistant:`;


    console.log("OLLAMA PROMPT:");
    console.log(prompt);
    console.log("PROMPT LENGTH:", prompt.length);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
            prompt,
            stream: false,
            keep_alive: "10m",
            options: {
                temperature: 0.5,
                num_predict: 40,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `Ollama error ${response.status}: ${errorText}`
        );
    }

    const data = await response.json();

    console.log("OLLAMA STATS:", {
        total: Math.round(data.total_duration / 1e6),
        load: Math.round(data.load_duration / 1e6),
        promptEval: Math.round(data.prompt_eval_duration / 1e6),
        promptTokens: data.prompt_eval_count,
        eval: Math.round(data.eval_duration / 1e6),
        generatedTokens: data.eval_count,
    });

    return data.response?.trim() || "No response found.";
}

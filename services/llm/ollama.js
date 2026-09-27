const OLLAMA_URL =
    process.env.OLLAMA_URL || "http://localhost:11434";

const MODEL =
    process.env.OLLAMA_MODEL || "gemma3:1b";

export async function generateAnswer({
    systemPrompt,
    context,
    question,
}) {
    const prompt = `${systemPrompt}

Context:
${context}

Question:
${question}

Answer:`;

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
                num_predict: 50,
                temperature: 0.2,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(
            `Ollama request failed: ${response.status} ${response.statusText}`
        );
    }

    const data = await response.json();

    console.log("RAG OLLAMA STATS:", {
        total: Math.round(data.total_duration / 1e6),
        load: Math.round(data.load_duration / 1e6),
        promptEval: Math.round(data.prompt_eval_duration / 1e6),
        promptTokens: data.prompt_eval_count,
        eval: Math.round(data.eval_duration / 1e6),
        generatedTokens: data.eval_count,
    });

    return data.response?.trim() || "No response found.";
}

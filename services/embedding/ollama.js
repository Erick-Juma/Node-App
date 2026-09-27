const OLLAMA_URL =
    process.env.OLLAMA_URL || "http://localhost:11434";

const MODEL =
    process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";

export async function generateEmbedding(text) {
    const start = Date.now();
    const response = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
            input: text,
            keep_alive: "10m",
        }),
    });

    console.log(
        `Ollama embedding request: ${Date.now() - start}ms`
    );

    if (!response.ok) {
        throw new Error(
            `Ollama embedding request failed: ${response.status} ${response.statusText}`
        );
    }

    const data = await response.json();

    if (!data.embeddings?.[0]) {
        throw new Error("Ollama returned no embedding");
    }

    return data.embeddings[0];
}

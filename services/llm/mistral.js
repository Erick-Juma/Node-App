// Updated URL to point to OpenRouter's aggregation endpoint
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function generateAnswer({ systemPrompt, question }) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Swap out your Mistral key for your OpenRouter API key
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      // Optional headers required by OpenRouter to track your app ranking
      "HTTP-Referer": "http://localhost:3000", 
      "X-OpenRouter-Title": "NodeJS RAG Application",
    },
    body: JSON.stringify({
      // Fall back to a highly capable free model if the env variable isn't set
      model: process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct:free",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    }),
  });
console.log(res);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`OpenRouter returned ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }

  // The response body JSON structure is identical to Mistral/OpenAI!
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}


const aiConfigElement = document.getElementById("assistant-config");

const aiConfigs = JSON.parse(aiConfigElement.textContent);

const API_URL = aiConfigs.api_url;

const $ = (id) => document.getElementById(id);
const widget = $("aiWidget"), chat = $("aiChat"), launcher = $("aiLauncher");
const messages = $("aiMessages"), empty = $("aiEmpty");
const input = $("aiInput"), send = $("aiSend");
let busy = false;

/* Conversation memory lives in the page and is sent with each question for context */
const MAX_HISTORY = 20;           // last 20 messages (10 back-and-forths)
let chatHistory = [];             // [{ role: "user" | "bot", text }]

/* Random id that groups one visit's questions together in the server log */
const sessionId = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now() + "-" + Math.random().toString(36).slice(2);

/* Open / minimize / maximize */
function setOpen(open) {
    widget.classList.toggle("open", open);
    chat.inert = !open;
    launcher.inert = open;
    if (open) input.focus(); else launcher.focus();
}
function setMax(max) { chat.classList.toggle("max", max); }

launcher.addEventListener("click", () => setOpen(true));
$("aiMinimize").addEventListener("click", () => setOpen(false));
$("aiExpand").addEventListener("click", () => setMax(true));
$("aiRestore").addEventListener("click", () => setMax(false));
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && widget.classList.contains("open")) setOpen(false);
});

/* Messages */
function addMessage(role, text) {
    empty.hidden = true;
    const row = document.createElement("div");
    row.className = "ai-row " + role;
    if (role === "bot") {
        row.innerHTML = '<span class="ai-avatar" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2 6.2 6.2 2-6.2 2-2 6.3-2-6.3-6.2-2 6.2-2z"/></svg></span>';
    }
    const bubble = document.createElement("div");
    bubble.className = "ai-bubble";
    if (text) bubble.textContent = text;
    row.append(bubble);
    messages.append(row);
    messages.scrollTop = messages.scrollHeight;
    return { row, bubble };
}

/* Input */
function updateInput() {
    input.style.height = "40px";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
    send.disabled = busy || !input.value.trim();
}
input.addEventListener("input", updateInput);
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(); }
});
send.addEventListener("click", ask);

/* Ask */
async function ask() {
    const prompt = input.value.trim();
    if (!prompt || busy) return;

    busy = true;
    addMessage("user", prompt);
    input.value = "";
    updateInput();

    // Thinking state
    const thinking = addMessage("bot");
    thinking.bubble.innerHTML = '<div class="ai-dots" aria-label="Thinking"><span></span><span></span><span></span></div>';

    let reply, failed = false;

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt,
                history: chatHistory,
                sessionId,
                aiConfigs: aiConfigs,
                context: window.ASK_AI_CONTEXT || null   // e.g. { courseId, courseTitle }, read at send time
            })
        });
        let data = {};
        try { data = await res.json(); } catch { }
        if (res.ok) {
            reply = data.response || "No response received.";
            // Remember this exchange (failed requests are not remembered)
            chatHistory.push({ role: "user", text: prompt }, { role: "bot", text: reply });
            chatHistory = chatHistory.slice(-MAX_HISTORY);
        }
        else {
            failed = true;
            // accept { error: "text" } or { error: { message: "text" } }
            reply = (typeof data.error === "string" ? data.error : data.error && data.error.message)
                || "Something went wrong. Try again.";
        }
    } catch (err) {
        console.error("AI request failed:", err);
        failed = true;
        reply = "Couldn't reach the server. Check your connection and try again.";
    }

    thinking.bubble.textContent = reply;
    if (failed) thinking.row.classList.add("error");
    messages.scrollTop = messages.scrollHeight;

    busy = false;
    updateInput();
    input.focus();
}

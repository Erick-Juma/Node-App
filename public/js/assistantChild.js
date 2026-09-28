/* Ask AI widget script.
   Wrapped in an IIFE so nothing here leaks into the global scope
   (the old top-level `const $` was overriding jQuery's `$` on the page). */
(() => {
    const aiConfigs = window.assistantConfig;
    if (!aiConfigs) return;

    const API_URL = aiConfigs.api_url;

    // Local helper, deliberately NOT named `$`
    const byId = (id) => document.getElementById(id);

    const widget = byId("aiWidget");
    const chat = byId("aiChat");
    const launcher = byId("aiLauncher");
    const messages = byId("aiMessages");
    const empty = byId("aiEmpty");
    const input = byId("aiInput");
    const send = byId("aiSend");

    // Widget markup missing on this page: do nothing rather than throw
    if (!widget || !chat || !launcher || !messages || !input || !send) return;

    let busy = false;

    /* Conversation memory lives in the page and is sent with each question for context */
    const MAX_HISTORY = 20; // last 20 messages (10 back-and-forths)
    let chatHistory = []; // [{ role: "user" | "bot", text }]

    /* Random id that groups one visit's questions together in the server log */
    const sessionId =
        window.crypto && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now() + "-" + Math.random().toString(36).slice(2);

    /* ---------- Open / minimize / maximize ---------- */
    function handleOutsideClick(e) {
        if (!widget.contains(e.target) && !launcher.contains(e.target)) {
            setOpen(false);
        }
    }

    function setOpen(open) {
        widget.classList.toggle("open", open);
        chat.inert = !open;
        launcher.inert = open;
        if (open) {
            input.focus();
            document.addEventListener("click", handleOutsideClick);
        } else {
            launcher.focus();
            document.removeEventListener("click", handleOutsideClick);
        }
    }

    function setMax(max) {
        chat.classList.toggle("max", max);
    }

    launcher.addEventListener("click", () => setOpen(true));
    byId("aiMinimize")?.addEventListener("click", () => setOpen(false));
    byId("aiExpand")?.addEventListener("click", () => setMax(true));
    byId("aiRestore")?.addEventListener("click", () => setMax(false));

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && widget.classList.contains("open")) setOpen(false);
    });

    /* ---------- Messages ---------- */
    function addMessage(role, text) {
        if (empty) empty.hidden = true;
        const row = document.createElement("div");
        row.className = "ai-row " + role;
        if (role === "bot") {
            row.innerHTML =
                '<span class="ai-avatar" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2 6.2 6.2 2-6.2 2-2 6.3-2-6.3-6.2-2 6.2-2z"/></svg></span>';
        }
        const bubble = document.createElement("div");
        bubble.className = "ai-bubble";
        if (text) bubble.textContent = text;
        row.append(bubble);
        messages.append(row);
        messages.scrollTop = messages.scrollHeight;
        return { row, bubble };
    }

    /* ---------- Input ---------- */
    function updateInput() {
        input.style.height = "40px";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
        send.disabled = busy || !input.value.trim();
    }

    input.addEventListener("input", updateInput);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            ask();
        }
    });
    send.addEventListener("click", ask);

    /* ---------- Ask ---------- */
    async function ask() {
        const prompt = input.value.trim();
        if (!prompt || busy) return;

        busy = true;
        addMessage("user", prompt);
        input.value = "";
        updateInput();

        // Thinking state
        const thinking = addMessage("bot");
        thinking.bubble.innerHTML =
            '<div class="ai-dots" aria-label="Thinking"><span></span><span></span><span></span></div>';

        let reply,
            failed = false;

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // send the session cookie so per-session rate limiting works
                body: JSON.stringify({
                    message: prompt, // what /api/chat/erevuka-assistant reads
                    prompt, // kept for any backend that still expects `prompt`
                    history: chatHistory,
                    sessionId,
                    aiConfigs,
                    context: window.ASK_AI_CONTEXT || null, // e.g. { courseId, courseTitle }, read at send time
                }),
            });

            let data = {};
            try {
                data = await res.json();
            } catch {}

            if (res.ok) {
                reply = data.response || "No response received.";
                // Remember this exchange (failed requests are not remembered)
                chatHistory.push({ role: "user", text: prompt }, { role: "bot", text: reply });
                chatHistory = chatHistory.slice(-MAX_HISTORY);
            } else {
                failed = true;
                // accept { error: "text" } or { error: { message: "text" } }
                reply =
                    (typeof data.error === "string"
                        ? data.error
                        : data.error && data.error.message) ||
                    "Something went wrong. Try again.";
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
})();
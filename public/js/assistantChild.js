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

    // Topic elements (optional: pages without topic markup keep working as before)
    const topicBar = byId("aiTopicBar");
    const topicLabel = byId("aiTopicLabel");
    const changeTopicBtn = byId("aiChangeTopic");
    const topicsEnabled = !!(topicBar && topicLabel && changeTopicBtn);

    let busy = false;
    let currentTopic = null; // topic id as a string, or null = all topics
    let topicChosen = !topicsEnabled; // if there is no topic UI, chatting is allowed straight away

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
            if (topicChosen) {
                input.focus();
            } else {
                // input is disabled until a topic is picked, so focus the first topic instead
                widget.querySelector(".ai-topic-btn")?.focus();
            }
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
        send.disabled = busy || !topicChosen || !input.value.trim();
    }

    input.addEventListener("input", updateInput);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            ask();
        }
    });
    send.addEventListener("click", ask);

    function selectTopic(id, name) {
        currentTopic = id || null;
        topicChosen = true;
        topicLabel.textContent = name;
        topicBar.hidden = false;
        if (empty) empty.hidden = true;
        input.disabled = false;
        input.placeholder = "Ask about " + name.toLowerCase() + "…";
        updateInput();
    }

    widget.querySelectorAll(".ai-topic-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            selectTopic(btn.dataset.topic, btn.dataset.name);
            input.focus();
        });
    });
    /* ---------- Topics ---------- */
    function lockInput() {
        input.disabled = true;
        input.value = "";
        input.placeholder = "Choose a topic first";
        updateInput();
    }

    if (topicsEnabled) {
        lockInput();

        widget.querySelectorAll(".ai-topic-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                currentTopic = btn.dataset.topic || null;
                topicChosen = true;
                topicLabel.textContent = btn.dataset.name;
                topicBar.hidden = false;
                if (empty) empty.hidden = true;
                input.disabled = false;
                input.placeholder = "Ask about " + btn.dataset.name.toLowerCase() + "…";
                updateInput();
                input.focus();
            });
        });

        changeTopicBtn.addEventListener("click", () => {
            if (busy) return; // don't wipe the chat while a reply is loading

            // remove chat bubbles but keep #aiEmpty in the DOM
            [...messages.children].forEach((el) => {
                if (el !== empty) el.remove();
            });

            chatHistory = []; // old answers belong to the old topic
            currentTopic = null;
            topicChosen = false;
            topicBar.hidden = true;
            if (empty) empty.hidden = false;
            lockInput();
            widget.querySelector(".ai-topic-btn")?.focus();
        });
    }

    /* ---------- Ask ---------- */
    async function ask(retryPrompt) {
        const isRetry = typeof retryPrompt === "string";
        const prompt = (isRetry ? retryPrompt : input.value).trim();
        if (!prompt || busy || !topicChosen) return;

        busy = true;
        if (!isRetry) {
            addMessage("user", prompt); // a retry reuses the question already on screen
            input.value = "";
        }
        updateInput();

        // Thinking state
        const thinking = addMessage("bot");
        thinking.bubble.innerHTML =
            '<div class="ai-dots" aria-label="Thinking"><span></span><span></span><span></span></div>';

        let reply,
            failed = false,
            data = {};

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // send the session cookie so per-session rate limiting works
                body: JSON.stringify({
                    message: prompt, // what /api/chat/erevuka-assistant reads
                    prompt, // kept for any backend that still expects `prompt`
                    topic: currentTopic, // topic id as a string, or null for all topics
                    history: chatHistory,
                    sessionId,
                    aiConfigs,
                    context: window.ASK_AI_CONTEXT || null, // e.g. { courseId, courseTitle }, read at send time
                }),
            });

            try {
                data = await res.json();
            } catch { }

            if (res.ok) {
                reply = data.response || "No response received.";
                // Remember this exchange (failed requests and topic suggestions are not remembered)
                if (!data.suggestTopic) {
                    chatHistory.push({ role: "user", text: prompt }, { role: "bot", text: reply });
                    chatHistory = chatHistory.slice(-MAX_HISTORY);
                }
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

        // Borderline match in another topic: offer to switch and ask again
        if (!failed && topicsEnabled && data.suggestTopic) {
            const target = widget.querySelector(
                '.ai-topic-btn[data-topic="' + CSS.escape(String(data.suggestTopic)) + '"]'
            );
            if (target) {
                const note = document.createElement("div");
                note.className = "ai-topic-note";

                const btn = document.createElement("button");
                btn.type = "button";
                btn.textContent = "Switch to " + target.dataset.name + " and ask again";
                btn.addEventListener("click", () => {
                    if (busy) return;
                    selectTopic(target.dataset.topic, target.dataset.name);
                    note.remove();
                    ask(prompt);
                });

                note.append(btn);
                thinking.bubble.append(note);
            }
        }

        // Confident answer from another topic: say where it came from
        if (
            !failed &&
            topicsEnabled &&
            currentTopic &&
            data.fromTopic &&
            String(data.fromTopic) !== String(currentTopic)
        ) {
            const target = widget.querySelector(
                '.ai-topic-btn[data-topic="' + CSS.escape(String(data.fromTopic)) + '"]'
            );
            if (target) {
                const note = document.createElement("div");
                note.className = "ai-topic-note";
                note.append("From " + target.dataset.name + ". ");

                const link = document.createElement("button");
                link.type = "button";
                link.textContent = "Switch to this topic";
                link.addEventListener("click", () => {
                    selectTopic(target.dataset.topic, target.dataset.name);
                    note.remove();
                    input.focus();
                });

                note.append(link);
                thinking.bubble.append(note);
            }
        }

        messages.scrollTop = messages.scrollHeight;

        busy = false;
        updateInput();
        input.focus();
    }
})();
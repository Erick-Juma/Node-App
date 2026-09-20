/*!
 * Ask AI widget: embeddable chat bubble for any web page.
 *
 * Add to any page (Laravel layout, Open edX theme, plain HTML...):
 *
 *   <script src="https://YOUR-GATEWAY/widget/ask-ai.js" defer
 *           data-ask-ai
 *           data-title="Ask AI"
 *           data-accent="#2563eb"></script>
 *
 * Optional attributes:
 *   data-endpoint     full URL of the ask endpoint (default: /api/v1/ask on the gateway that served this file)
 *   data-title        window title and button label (default "Ask AI")
 *   data-placeholder  input placeholder
 *   data-theme        "light" or "dark" to force a theme (default: follow the visitor's OS setting)
 *
 * Colours (any of these can be set as data-* attributes, or as CSS variables in your own stylesheet):
 *   data-accent (--ai-accent)      launcher, buttons, your message bubble
 *   data-accent-text (--ai-accent-ink)  text/icons on the accent colour
 *   data-bg (--ai-bg)              window background
 *   data-text (--ai-ink)           main text
 *   data-bot-bg (--ai-bot)         AI reply bubble
 *   data-user-bg (--ai-user-bg)    your message bubble (default: accent)
 *   data-user-text (--ai-user-ink) text in your message bubble
 *   data-muted (--ai-muted), data-line (--ai-line)   secondary text, borders
 *
 * From CSS instead:   #ask-ai-root { --ai-bg: #fdf2f8; --ai-bot: #fce7f3; }
 *
 * Optional page context (read each time a question is sent):
 *   window.ASK_AI_CONTEXT = { courseId: "...", courseTitle: "..." };
 */
(() => {
  if (window.__askAiLoaded) return;          // don't load twice on the same page
  window.__askAiLoaded = true;

  const script = document.currentScript || document.querySelector("script[data-ask-ai]");
  const d = (script && script.dataset) || {};
  const cfg = {
    endpoint: d.endpoint || "",
    title: d.title || "Ask AI",
    placeholder: d.placeholder || "Type your prompt here...",
    theme: d.theme === "light" || d.theme === "dark" ? d.theme : ""
  };

  /* data-* attribute -> CSS variable (the calling app can also set these variables in its own CSS) */
  const THEME_ATTRS = {
    accent: "--ai-accent",       // data-accent
    accentText: "--ai-accent-ink", // data-accent-text
    bg: "--ai-bg",               // data-bg
    text: "--ai-ink",            // data-text
    muted: "--ai-muted",         // data-muted
    line: "--ai-line",           // data-line
    botBg: "--ai-bot",           // data-bot-bg
    userBg: "--ai-user-bg",      // data-user-bg
    userText: "--ai-user-ink"    // data-user-text
  };

  const CSS = `
/* ===== Ask AI widget (lives in a Shadow DOM, so your site's CSS can't affect it) ===== */

/* Stop inherited page styles (fonts, colours, text-align...) leaking in */
:host { all: initial; }

:host {
  --ai-accent: #2563eb;        /* buttons, launcher, your message bubble */
  --ai-accent-ink: #ffffff;    /* text/icons on the accent colour */
  --ai-bg: #ffffff;            /* window background */
  --ai-ink: #1e293b;           /* main text */
  --ai-muted: #64748b;
  --ai-line: #e2e8f0;          /* borders */
  --ai-bot: #f1f5f9;           /* AI reply bubble */
  --ai-user-bg: var(--ai-accent);        /* your message bubble (defaults to accent) */
  --ai-user-ink: var(--ai-accent-ink);
  --ai-err-bg: #fef2f2;
  --ai-err-ink: #b91c1c;
}

/* Dark values: follow the visitor's OS unless data-theme forces light or dark */
@media (prefers-color-scheme: dark) {
  :host(:not([data-theme="light"])) {
    --ai-accent: #3b82f6;
    --ai-bg: #1a1d24;
    --ai-ink: #e8eaf0;
    --ai-muted: #98a1b3;
    --ai-line: #2d323d;
    --ai-bot: #262b35;
    --ai-err-bg: #3a1c1c;
    --ai-err-ink: #fca5a5;
  }
}
:host([data-theme="dark"]) {
  --ai-accent: #3b82f6;
  --ai-bg: #1a1d24;
  --ai-ink: #e8eaf0;
  --ai-muted: #98a1b3;
  --ai-line: #2d323d;
  --ai-bot: #262b35;
  --ai-err-bg: #3a1c1c;
  --ai-err-ink: #fca5a5;
}

.ai-widget, .ai-widget * { box-sizing: border-box; }
/* all: initial inside the shadow tree wipes anything inherited from the host page (letter-spacing, text-align...) */
  .ai-widget { all: initial; display: block; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 15px; line-height: 1.5; color: var(--ai-ink); }
.ai-widget button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; }
.ai-widget button:focus-visible, .ai-widget textarea:focus-visible { outline: 2px solid var(--ai-accent); outline-offset: 2px; }
.ai-widget svg { display: block; }

/* ---------- Floating icon ---------- */
.ai-launcher {
  position: fixed; right: 24px; bottom: 24px; z-index: 9998;
  width: 58px; height: 58px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--ai-accent); color: var(--ai-accent-ink);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ai-accent) 45%, transparent);
  transition: transform .2s ease, opacity .15s ease;
}
.ai-launcher:hover { transform: scale(1.06); }
.ai-widget.open .ai-launcher { opacity: 0; transform: scale(.7); pointer-events: none; }

/* ---------- Chat window ---------- */
.ai-chat {
  position: fixed; right: 24px; bottom: 24px; z-index: 9999;
  width: 380px; height: min(560px, calc(100vh - 48px));
  height: min(560px, calc(100dvh - 48px));
  display: flex; flex-direction: column;
  background: var(--ai-bg);
  border: 1px solid var(--ai-line); border-radius: 18px;
  box-shadow: 0 20px 50px -10px rgba(15, 23, 42, .35);
  overflow: hidden;

  transform-origin: 100% 100%;
  opacity: 0; visibility: hidden; transform: translateY(10px) scale(.94);
  transition: opacity .18s ease, transform .22s ease, visibility 0s linear .22s,
              width .25s ease, height .25s ease;
}
.ai-widget.open .ai-chat { opacity: 1; visibility: visible; transform: none; transition-delay: 0s; }

/* Maximized */
.ai-chat.max { width: min(900px, calc(100vw - 48px)); height: calc(100vh - 48px); height: calc(100dvh - 48px); }

/* ---------- Header ---------- */
.ai-header { display: flex; align-items: center; gap: 10px; padding: 12px 10px 12px 14px; border-bottom: 1px solid var(--ai-line); }
.ai-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--ai-accent); color: var(--ai-accent-ink); display: grid; place-items: center; flex: none; }
.ai-title { flex: 1; margin: 0; font-size: 15px; font-weight: 600; }
.ai-icon-btn { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; color: var(--ai-muted); }
.ai-icon-btn:hover { background: var(--ai-bot); color: var(--ai-ink); }
.ai-restore { display: none; }
.ai-chat.max .ai-expand { display: none; }
.ai-chat.max .ai-restore { display: block; }

/* ---------- Messages ---------- */
.ai-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 12px; }

.ai-empty { margin: auto; text-align: center; color: var(--ai-muted); padding: 0 20px; }

.ai-row { display: flex; align-items: flex-end; gap: 8px; }
.ai-row.user { justify-content: flex-end; }
.ai-row .ai-avatar { width: 26px; height: 26px; }

.ai-bubble { max-width: 80%; padding: 9px 14px; white-space: pre-wrap; overflow-wrap: anywhere; }
.ai-chat.max .ai-bubble { max-width: 70%; }

/* You: accent colour, right side */
.ai-row.user .ai-bubble { background: var(--ai-user-bg); color: var(--ai-user-ink); border-radius: 18px 18px 4px 18px; }

/* AI: grey, left side, with avatar */
.ai-row.bot .ai-bubble { background: var(--ai-bot); border-radius: 18px 18px 18px 4px; }
.ai-row.bot.error .ai-bubble { background: var(--ai-err-bg); color: var(--ai-err-ink); }

/* Thinking dots */
.ai-dots { display: flex; gap: 4px; padding: 6px 2px; }
.ai-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--ai-muted); animation: ai-bounce 1.2s infinite ease-in-out; }
.ai-dots span:nth-child(2) { animation-delay: .15s; }
.ai-dots span:nth-child(3) { animation-delay: .3s; }
@keyframes ai-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .4; } 30% { transform: translateY(-5px); opacity: 1; } }

/* ---------- Input ---------- */
.ai-input { display: flex; align-items: flex-end; gap: 8px; padding: 10px 12px 12px; border-top: 1px solid var(--ai-line); }
.ai-input textarea {
  flex: 1; min-width: 0; height: 40px; max-height: 120px; resize: none;
  padding: 9px 12px; border: 1px solid var(--ai-line); border-radius: 12px;
  background: transparent; color: var(--ai-ink); font: inherit; line-height: 1.4;
}
.ai-input textarea::placeholder { color: var(--ai-muted); }
.ai-input textarea:focus { outline: none; border-color: var(--ai-accent); }
.ai-send { width: 40px; height: 40px; border-radius: 12px; background: var(--ai-accent); color: var(--ai-accent-ink); display: grid; place-items: center; flex: none; }
.ai-send:disabled { opacity: .45; cursor: not-allowed; }

/* ---------- Phones: full screen ---------- */
@media (max-width: 520px) {
  .ai-chat, .ai-chat.max { inset: 0; width: auto; height: auto; border: 0; border-radius: 0; }
  .ai-expand, .ai-restore { display: none !important; }
  .ai-input textarea { font-size: 16px; }
  .ai-launcher { right: 16px; bottom: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .ai-widget * { transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
`;

  const HTML = `
<div class="ai-widget" id="aiWidget">

  <!-- Floating icon -->
  <button class="ai-launcher" id="aiLauncher" type="button" aria-label="Ask AI">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>
    </svg>
  </button>

  <!-- Chat window -->
  <section class="ai-chat" id="aiChat" role="dialog" aria-label="Ask AI" inert>

    <header class="ai-header">
      <span class="ai-avatar" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2 6.2 6.2 2-6.2 2-2 6.3-2-6.3-6.2-2 6.2-2z"/></svg>
      </span>
      <h2 class="ai-title">Ask AI</h2>

      <!-- Maximize -->
      <button class="ai-icon-btn ai-expand" id="aiExpand" type="button" aria-label="Maximize" title="Maximize">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
      </button>
      <!-- Restore size -->
      <button class="ai-icon-btn ai-restore" id="aiRestore" type="button" aria-label="Restore size" title="Restore size">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 10l7-7M14 10V4M14 10h6M10 14l-7 7M10 14v6M10 14H4"/></svg>
      </button>
      <!-- Minimize -->
      <button class="ai-icon-btn" id="aiMinimize" type="button" aria-label="Minimize" title="Minimize">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>
      </button>
    </header>

    <div class="ai-messages" id="aiMessages" role="log" aria-live="polite">
      <div class="ai-empty" id="aiEmpty">Ask a question and the answer will show up here.</div>
    </div>

    <div class="ai-input">
      <textarea id="aiInput" rows="1" placeholder="Type your prompt here..." aria-label="Your question"></textarea>
      <button class="ai-send" id="aiSend" type="button" aria-label="Send" disabled>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>
    </div>

  </section>
</div>
`;

  function mount() {
    // Shadow DOM keeps the host page's CSS out, and ours in
    const host = document.createElement("div");
    host.id = "ask-ai-root";
    const shadow = host.attachShadow({ mode: "open" });

    try {
      const sheet = new CSSStyleSheet();     // constructable sheet: works even under strict CSP
      sheet.replaceSync(CSS);
      shadow.adoptedStyleSheets = [sheet];
    } catch {
      const style = document.createElement("style");
      style.textContent = CSS;
      shadow.append(style);
    }

    const wrap = document.createElement("div");
    wrap.innerHTML = HTML;
    shadow.append(...wrap.childNodes);
    document.body.append(host);

    /* Endpoint: data-endpoint if given, otherwise the gateway that served this script */
    const ENDPOINT = cfg.endpoint || (script && script.src ? new URL("/api/v1/ask", script.src).href : "/api/v1/ask");
    // POST { prompt, history, sessionId, context } -> { response } or { error }

    const $ = (id) => shadow.getElementById(id);
    const widget = $("aiWidget"), chat = $("aiChat"), launcher = $("aiLauncher");
    const messages = $("aiMessages"), empty = $("aiEmpty");
    const input = $("aiInput"), send = $("aiSend");
    let busy = false;

    /* Settings from data-* attributes */
    chat.setAttribute("aria-label", cfg.title);
    launcher.setAttribute("aria-label", cfg.title);
    shadow.querySelector(".ai-title").textContent = cfg.title;
    input.placeholder = cfg.placeholder;
    if (cfg.theme) host.setAttribute("data-theme", cfg.theme);
    Object.entries(THEME_ATTRS).forEach(([key, cssVar]) => {
      if (d[key]) host.style.setProperty(cssVar, d[key]);
    });

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

    /* Keep keystrokes typed inside the widget away from the host page. Many pages (video players,
       hotkey libraries...) treat Space and letters as shortcuts and cancel them, which stops typing. */
    ["keydown", "keyup", "keypress"].forEach((type) =>
      shadow.addEventListener(type, (e) => {
        if (type === "keydown" && e.key === "Escape" && widget.classList.contains("open")) setOpen(false);
        e.stopPropagation();
      })
    );

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
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            history: chatHistory,
            sessionId,
            context: window.ASK_AI_CONTEXT || null   // e.g. { courseId, courseTitle }, read at send time
          })
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (res.ok) {
          reply = data.response || "No response received.";
          // Remember this exchange (failed requests are not remembered)
          chatHistory.push({ role: "user", text: prompt }, { role: "bot", text: reply });
          chatHistory = chatHistory.slice(-MAX_HISTORY);
        } else {
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
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
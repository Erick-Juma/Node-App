// Platform where the chat is originating from
const configElement = document.getElementById("chat-config");
let platform = 'AKI';
let username = 'AKI Admin';

if (configElement) {
  try {
    const config = JSON.parse(configElement.textContent || "{}");
    platform = config.platform_id ?? platform;
    if (config.user_name != null && config.user_name !== 'null') {
      username = config.user_name;
    }
  } catch (error) {
    console.error("Invalid JSON in #chat-config:", error);
  }
} else {
  console.warn("#chat-config element not found on this page.");
}

const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatbot = document.querySelector('.chatbot');
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");
const maximizeBtn = document.getElementById("maximize-btn");
const inputInitHeight = chatInput.scrollHeight;

let isSending = false; // simple lock to prevent duplicate sends

const createChatLi = (message, className) => {
  const chatLi = document.createElement("li");
  chatLi.classList.add("chat", className);
  chatLi.innerHTML = className === "outgoing"
    ? `<p></p>`
    : `<span><img src="https://img.icons8.com/?size=256&id=37410&format=png" alt=""></span><p></p>`;
  chatLi.querySelector("p").textContent = message;
  return chatLi;
};

const generateResponse = async (chatElement, userMessage) => {
  const messageElement = chatElement.querySelector("p");
  const API_URL = `${window.location.origin}/api/chat/aki`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message: userMessage }),
    });

    if (response.status === 429) {
      messageElement.classList.add("error");
      messageElement.textContent = "Too many requests. Please slow down.";
      return;
    }

    if (response.status === 503) {
      messageElement.classList.add("error");
      messageElement.textContent = "The AI model is busy. Try again in a few seconds.";
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unexpected server error');
    }

    const data = await response.json();
    messageElement.textContent = data.response?.trim() || "No response received.";
  } catch (error) {
    console.error("Error generating response:", error);
    messageElement.classList.add("error");
    messageElement.textContent = "Oops! Something went wrong. Please try again.";
  } finally {
    chatbox.scrollTo(0, chatbox.scrollHeight);
  }
};

const handleChat = async () => {
  const userMessage = chatInput.value.trim();
  if (!userMessage || isSending) return;

  isSending = true;
  sendChatBtn.style.pointerEvents = "none";

  const MSG_URL = `${window.location.origin}/api/saveMessage`;

  try {
    const response = await fetch(MSG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message: userMessage, platform, username }),
    });

    if (response.status === 429) {
      chatInput.value = "";
      chatbox.appendChild(createChatLi("Too many requests. Please slow down and try again later.", "incoming"));
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Unexpected server error');
    }

    // UI updates
    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;
    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);

    setTimeout(() => {
      const incomingChatLi = createChatLi("generating responses...", "incoming");
      chatbox.appendChild(incomingChatLi);
      chatbox.scrollTo(0, chatbox.scrollHeight);
      generateResponse(incomingChatLi, userMessage);
    }, 600);

  } catch (error) {
    console.error('Error saving message:', error);
    chatInput.value = "";
    chatbox.appendChild(createChatLi("Oops! Something went wrong. Please try again.", "incoming"));
  } finally {
    isSending = false;
    sendChatBtn.style.pointerEvents = "auto";
  }
};

chatInput.addEventListener("input", () => {
  chatInput.style.height = `${inputInitHeight}px`;
  chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
    e.preventDefault();
    handleChat();
  }
});

function handleClick(event) {
  if (!chatbot.contains(event.target)) {
    document.body.classList.remove("show-chatbot");
  }
}

document.addEventListener('click', handleClick);

// Single toggler listener — one source of truth (body class)
chatbotToggler.addEventListener('click', (event) => {
  event.stopPropagation();
  document.body.classList.toggle("show-chatbot");
});

sendChatBtn.addEventListener("click", handleChat);

closeBtn.addEventListener("click", () => {
  document.body.classList.remove("show-chatbot", "maximize-chatbot");
  maximizeBtn.textContent = "🗖";
});

maximizeBtn.addEventListener("click", () => {
  document.body.classList.toggle("maximize-chatbot");
  const isMaximized = document.body.classList.contains("maximize-chatbot");
  maximizeBtn.textContent = isMaximized ? "🗕" : "🗖";
});
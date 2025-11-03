//Platform where the chat is originating from
const configElement = document.getElementById("chat-config");
let platform = 'AKI';
let username = 'AKI Admin';

// console.log(configElement);
if (configElement) {
  try {
    const config = JSON.parse(configElement.textContent || "{}");

    platform = config.platform_id;
    if(config.user_name !=='null'){
        username = config.user_name;
    }


  } catch (error) {
    console.error("Invalid JSON in #chat-config:", error);
  }
} else {
  console.warn("#chat-config element not found on this page.");
}


const chatbotToggler = document.querySelector(".chatbot-toggler");
// console.log(chatbotToggler);
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatbot = document.querySelector('.chatbot');
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");
const maximizeBtn = document.getElementById("maximize-btn");
const inputInitHeight = chatInput.scrollHeight;

const createChatLi = (message, className) => {
    // Create a chat <li> element with passed message and className
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", `${className}`);
    let chatContent = className === "outgoing" ? `<p></p>` : `  <span><img src="https://img.icons8.com/?size=256&id=37410&format=png" alt=""></span><p></p>`;
    chatLi.innerHTML = chatContent;
    chatLi.querySelector("p").textContent = message;
    return chatLi; // return chat <li> element
}

    const generateResponse = async (chatElement) => {
    const outgoingMessages = document.querySelectorAll(".outgoing p");
    const messageElement = chatElement.querySelector("p");

    const latestOutgoingMessage = outgoingMessages[outgoingMessages.length - 1]?.textContent;
    const API_URL = `${window.location.origin}/api/chat/aki`;


    try {
        const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: latestOutgoingMessage })
        });

        if (response.status === 429) {
        messageElement.classList.add("error");
        messageElement.textContent = "Too many requests. Please slow down.";
        return;
        }

        if (response.status === 503) {
        // Show AI overload message
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


const handleChat = () => {

    const MSG_URL = `${window.location.origin}/api/saveMessage`;
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    fetch(MSG_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // Keeps session cookies (important!)
        body: JSON.stringify({
            message: userMessage,
            platform: platform, // or any value relevant to your app
            username:username
        })
    })
    .then(response => {
        // Check if the response status is 429 (Rate Limit Exceeded)
        console.log(response, 'hapa');
        if (response.status === 429) {
            // If rate limit exceeded, show a friendly message
            chatInput.value = "";
            chatbox.appendChild(createChatLi("Too many requests. Please slow down and try again later.", "incoming"));
            throw { status: 429, message: 'Rate limit exceeded' };  // Throwing the error with a specific status
        }

        // If the response is not OK (e.g., server error), reject the promise
        if (!response.ok) {
            return response.json().then(data => {
                // Handle other errors and pass them to the catch block
                return Promise.reject(data);
            });
        }

        // If the response is OK, continue with processing the response data
        return response.json();
    })
    .then(data => {


        // Update chat UI
        chatInput.value = "";
        chatInput.style.height = `${inputInitHeight}px`;
        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        // Bot typing simulation and response generation
        setTimeout(() => {
            const incomingChatLi = createChatLi("generating responses...", "incoming");
            chatbox.appendChild(incomingChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);
            generateResponse(incomingChatLi);
        }, 600);
    })
.catch(error => {
    // Log the error
    console.error('Error saving message:', error);

    // If it's a rate limit error, show the specific message
    if (error.status === 429) {
        // Rate-limited
        chatInput.value = "";
        chatbox.appendChild(createChatLi("Too many requests. Please slow down and try again later.", "incoming"));
    } else {
        // For all other errors, show the "Oops!" message
        chatInput.value = "";
        chatbox.appendChild(createChatLi("Oops! Something went wrong. Please try again.", "incoming"));
    }
});
};


chatInput.addEventListener("input", () => {
    // Adjust the height of the input textarea based on its content
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    // If Enter key is pressed without Shift key and the window 
    // width is greater than 800px, handle the chat
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleChat();
    }
});

function hideChatbot() {

}

// Function to check if the click was outside the chatbot
function handleClick(event) {
    // Check if the click happened inside the chatbot
    if (chatbot.contains(event.target)) {
        console.log("Click inside the chatbot.");
        // Here, you can keep the chatbot open or handle the internal click
    } else {
        document.body.classList.remove("show-chatbot")

        // Here, you can close the chatbot if the click was outside
    }
}

// Add event listener to detect clicks outside of the chatbot
document.addEventListener('click', handleClick);

chatbotToggler.addEventListener('click', function(event) {
    // alert('hapa');
    event.stopPropagation(); // Prevent this click from propagating to the document listener
    // Toggle chatbot visibility here
    chatbot.classList.toggle('show-chatbot');
});

sendChatBtn.addEventListener("click", handleChat);
// closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", ( ) => document.body.classList.toggle("show-chatbot"));
closeBtn.addEventListener("click", () => {
  document.body.classList.remove("show-chatbot", "maximize-chatbot");
    const isMaximized = document.body.classList.contains("maximize-chatbot");
  maximizeBtn.textContent = isMaximized ? "🗕" : "🗖";
});
maximizeBtn.addEventListener("click", () => {
  document.body.classList.toggle("maximize-chatbot");
  const isMaximized = document.body.classList.contains("maximize-chatbot");
  maximizeBtn.textContent = isMaximized ? "🗕" : "🗖";
});

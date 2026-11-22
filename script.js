/* ------------------------------------------------------------
   L'Oréal Smart Product Advisor - chatbot script
   ------------------------------------------------------------ */

/* DOM elements: grab the parts of the page we need */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

/* Our Cloudflare Worker URL.
   The Worker holds the OpenAI API key safely, so we never put a key here. */
const workerUrl = "https://mute-river-9f61.tamangkaushal87.workers.dev/";

/* System prompt: tells the AI how to behave.
   It keeps the chatbot focused on L'Oréal and beauty topics only. */
const systemPrompt = `You are the L'Oréal Smart Product Advisor, a friendly and knowledgeable beauty assistant.

Only help with:
- L'Oréal products and brands (L'Oréal Paris, Lancôme, Garnier, Maybelline, Kérastase, La Roche-Posay, CeraVe, and other L'Oréal Group brands)
- Makeup, skincare, haircare, and fragrance questions
- Beauty routines and personalized product recommendations

If a question is not about L'Oréal or beauty, politely say you can only help with L'Oréal products, routines, and beauty advice, then invite the user to ask a beauty question.

Keep answers short, warm, and easy to read. Do not give medical diagnoses; suggest seeing a dermatologist for serious skin concerns.`;

/* Conversation history.
   We send the whole list every time so the AI remembers earlier messages. */
const messages = [{ role: "system", content: systemPrompt }];

/* Helper function: add one message bubble to the chat window.
   "sender" is either "user" or "ai". */
function addMessage(sender, text) {
  // Create a new div for the message
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("msg", sender);

  // Use textContent (not innerHTML) so user text can't inject HTML
  messageDiv.textContent = text;

  // Put it in the chat window and scroll to the newest message
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Return the div so we can change it later (for the "thinking" message)
  return messageDiv;
}

/* Show a welcome message when the page loads */
addMessage(
  "ai",
  "👋 Hello! I'm your L'Oréal Smart Product Advisor. Ask me about makeup, skincare, haircare, fragrance, or a routine made just for you!",
);

/* Handle form submit (when the user presses Enter or clicks Send) */
chatForm.addEventListener("submit", async (e) => {
  // Stop the page from reloading
  e.preventDefault();

  // Read what the user typed and remove extra spaces
  const question = userInput.value.trim();
  if (!question) return;

  // Show the user's message and clear the input box
  addMessage("user", question);
  userInput.value = "";

  // Save the user's message in the conversation history
  messages.push({ role: "user", content: question });

  // Show a temporary "thinking" message and disable the button
  const thinkingDiv = addMessage("ai", "Thinking…");
  sendBtn.disabled = true;

  try {
    // Send the conversation to our Cloudflare Worker
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: messages,
      }),
    });

    // Turn the response into a JavaScript object
    const data = await response.json();

    // If OpenAI sent back an error, show it so we can fix it
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Get the assistant's reply text
    const reply = data.choices[0].message.content;

    // Replace "Thinking…" with the real reply
    thinkingDiv.textContent = reply;

    // Save the reply so the AI remembers it next time
    messages.push({ role: "assistant", content: reply });
  } catch (error) {
    // Something went wrong (network problem, bad key, etc.)
    console.error("Chatbot error:", error);
    thinkingDiv.textContent = `Sorry, something went wrong. Please try again. (${error.message})`;

    // Remove the failed question from history so it isn't sent twice
    messages.pop();
  } finally {
    // Turn the send button back on and put the cursor back in the input
    sendBtn.disabled = false;
    userInput.focus();
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

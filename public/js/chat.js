const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const messagesDiv = document.getElementById("messages");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  appendMessage("Você", message);
  input.value = "";

  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    appendMessage("FURIA Bot", data.response);
  } catch (err) {
    console.error("Erro:", err);
    appendMessage("FURIA Bot", "Ocorreu um erro ao tentar responder.");
  }
});

function appendMessage(sender, text) {
    const msgElement = document.createElement("div");
  
    const isUser = sender.toLowerCase().includes("você");
  
    msgElement.classList.add("message", isUser ? "user" : "bot");
    msgElement.innerHTML = text.replace(/\n/g, "<br>");
  
    messagesDiv.appendChild(msgElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
  

document.querySelectorAll(".quick-buttons button").forEach(button => {
    button.addEventListener("click", () => {
      const msg = button.dataset.msg;
      document.getElementById("user-input").value = msg;
      document.getElementById("chat-form").dispatchEvent(new Event("submit"));
    });
  });
  

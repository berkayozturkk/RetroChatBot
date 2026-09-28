(function () {
  const logEl = document.getElementById("log");
  const form = document.getElementById("chat-form");
  const msgEl = document.getElementById("msg");
  const nickEl = document.getElementById("nick");
  const statusEl = document.getElementById("status");
  const hitsEl = document.getElementById("hits");
  const sendBtn = document.getElementById("send");

  const history = [];

  function padHits(n) {
    return String(n).padStart(7, "0");
  }

  let hits = 1337 + Math.floor(Math.random() * 50);
  hitsEl.textContent = padHits(hits);

  function addLine(cls, text) {
    const div = document.createElement("div");
    div.className = "line " + cls;
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  addLine("sys", "*** Welcome to #retrobot97");
  addLine("sys", "*** Topic: It's 1997. Ask me anything. Don't mention the future. ;-)");
  addLine("bot", "<RETRO-BOT> Hey! Modem handshake complete. What's on your homepage today?");

  async function pingHealth() {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (data.key_configured) {
        statusEl.textContent = "* Connected to cyberspace — Gemini line up (year 1997)";
      } else {
        statusEl.textContent = "* WARNING: GEMINI_API_KEY missing in .env — chat will fail";
        addLine("err", "*** Server: API key not set. Put GEMINI_API_KEY in .env and restart.");
      }
    } catch (err) {
      statusEl.textContent = "* Connection timed out (check if the server is running)";
    }
  }

  pingHealth();

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const text = msgEl.value.trim();
    const nick = (nickEl.value.trim() || "Guest").slice(0, 20);
    if (!text) return;

    msgEl.value = "";
    hits += 1;
    hitsEl.textContent = padHits(hits);

    addLine("me", "<" + nick + "> " + text);
    history.push({ role: "user", content: text });
    sendBtn.disabled = true;
    statusEl.textContent = "* Dialing... kkkkkSHHHHhhhhh... negotiating 56K...";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail || res.statusText;
        addLine("err", "*** ERROR: " + (typeof detail === "string" ? detail : JSON.stringify(detail)));
        history.pop();
        statusEl.textContent = "* Connection dropped. Try again.";
        return;
      }
      const reply = data.reply || "...";
      addLine("bot", "<RETRO-BOT> " + reply);
      history.push({ role: "assistant", content: reply });
      if (history.length > 24) history.splice(0, history.length - 24);
      statusEl.textContent = "* Message sent — still 1997, still online";
    } catch (err) {
      addLine("err", "*** Network error: " + err);
      history.pop();
      statusEl.textContent = "* ISP busy. Please try your call again later.";
    } finally {
      sendBtn.disabled = false;
      msgEl.focus();
    }
  });
})();

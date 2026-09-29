(function () {
  const logEl = document.getElementById("log");
  const form = document.getElementById("chat-form");
  const msgEl = document.getElementById("msg");
  const nickEl = document.getElementById("nick");
  const statusEl = document.getElementById("status");
  const hitsEl = document.getElementById("hits");
  const sendBtn = document.getElementById("send");
  const timeBtn = document.getElementById("time-jump");
  const chatTitleEl = document.getElementById("chat-title");

  const history = [];

  const ERAS = {
    1997: {
      bot: "RETRO-BOT",
      title: "mIRC - #retrobot97 on EFnet",
      button: ">> TIME MACHINE: JUMP TO 2040",
      dialing: "* Dialing... kkkkkSHHHHhhhhh... negotiating 56K...",
      sent: "* Message sent — still 1997, still online",
      online: "* Connected to cyberspace — Gemini line up (year 1997)",
    },
    2040: {
      bot: "RETRO-BOT 2040",
      title: "NeuralLink // #retrobot2040 @ orbital-mesh",
      button: "<< TIME MACHINE: BACK TO 1997",
      dialing: "* Neural-sync... quantum handshake in 0.0003 ms...",
      sent: "* Thought transmitted — welcome to 2040",
      online: "* Quantum mesh online — year 2040",
    },
  };
  let year = 1997;

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
        statusEl.textContent = ERAS[year].online;
      } else {
        statusEl.textContent = "* WARNING: GEMINI_API_KEY missing in .env — chat will fail";
        addLine("err", "*** Server: API key not set. Put GEMINI_API_KEY in .env and restart.");
      }
    } catch (err) {
      statusEl.textContent = "* Connection timed out (check if the server is running)";
    }
  }

  pingHealth();

  timeBtn.addEventListener("click", function () {
    year = year === 1997 ? 2040 : 1997;
    const era = ERAS[year];
    document.body.classList.toggle("era-2040", year === 2040);
    chatTitleEl.textContent = era.title;
    timeBtn.textContent = era.button;
    statusEl.textContent = era.online;
    if (year === 2040) {
      addLine("sys", "*** ZZZZAP!!! Flux capacitor engaged... 1997 -> 2040");
      addLine("bot", "<" + era.bot + "> Whoa... 43 yıllık güncelleme indi. Artık 2040'tayım! Ne sormak istersin?");
    } else {
      addLine("sys", "*** ZZZZAP!!! Rewinding the timeline... 2040 -> 1997");
      addLine("bot", "<" + era.bot + "> Hmm, garip bir rüya gördüm... Neyse, 1997'ye hoş geldin! :-)");
    }
    msgEl.focus();
  });

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
    const era = ERAS[year];
    statusEl.textContent = era.dialing;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, year: year }),
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
      addLine("bot", "<" + era.bot + "> " + reply);
      history.push({ role: "assistant", content: reply });
      if (history.length > 24) history.splice(0, history.length - 24);
      statusEl.textContent = era.sent;
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

(function () {
  const chat = document.getElementById("chat");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const starters = document.getElementById("starters");
  const crisisBar = document.getElementById("crisisBar");
  const statusLine = document.getElementById("statusLine");
  const sendBtn = document.getElementById("send");
  let busy = false;
  function sessionId() {
    try {
      let id = localStorage.getItem("ro_session_id");
      if (!id) {
        id = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("ro_session_id", id);
      }
      return id;
    } catch {
      return "default";
    }
  }
  let history = [];
  function addBubble(role, text) {
    const el = document.createElement("div");
    el.className = "bubble " + role;
    el.textContent = text;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }
  addBubble("ro", "سلام، رو‌ام.\nاینجام. بگو.");
  history.push({ role: "assistant", content: "سلام، رو‌ام.\nاینجام. بگو." });
  async function handleSend(text) {
    const clean = (text || "").trim();
    if (!clean || busy) return;
    busy = true;
    if (sendBtn) sendBtn.disabled = true;
    if (starters) starters.classList.add("hidden");
    addBubble("user", clean);
    history.push({ role: "user", content: clean });
    input.value = "";
    if (statusLine) statusLine.textContent = "…";
    let replyText = null;
    let safetyLevel = 0;
    let source = "local";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: history.slice(0, -1),
          stream: false,
          session_id: sessionId(),
          user_id: sessionId(),
        }),
      });
      const data = await res.json();
      if (data && data.reply) {
        replyText = data.reply;
        safetyLevel = data.safety || 0;
        source = data.source || "llm";
      }
    } catch (e) {}
    if (!replyText && window.RoEngine) {
      const result = window.RoEngine.reply(clean);
      replyText = result.text;
      safetyLevel = (result.safety && result.safety.level) || 0;
      source = "local";
    }
    if (!replyText) replyText = "اینجام. دوباره بگو.";
    addBubble("ro", replyText);
    history.push({ role: "assistant", content: replyText });
    if (statusLine) statusLine.textContent = safetyLevel >= 2 ? "اولویت: ایمنی" : source === "llm" ? "رو · مدل" : "رو · محلی";
    if (crisisBar) crisisBar.classList.toggle("hidden", safetyLevel < 2);
    busy = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    handleSend(input.value);
  });
  if (starters) {
    starters.addEventListener("click", function (e) {
      const b = e.target.closest("button[data-text]");
      if (b) handleSend(b.getAttribute("data-text"));
    });
  }
  const btnNew = document.getElementById("btnNew");
  if (btnNew) {
    btnNew.addEventListener("click", function () {
      if (window.RoEngine) window.RoEngine.reset();
      try { localStorage.removeItem("ro_session_id"); } catch {}
      chat.innerHTML = "";
      history = [];
      if (crisisBar) crisisBar.classList.add("hidden");
      if (starters) starters.classList.remove("hidden");
      addBubble("ro", "از نو.\nبگو.");
      history.push({ role: "assistant", content: "از نو.\nبگو." });
    });
  }
  input && input.focus();
})();

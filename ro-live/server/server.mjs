/**
 * Ro compact server — static UI + safety + optional OpenAI-compatible LLM
 * Full stack also in RO_SOURCE_BOX; this runs standalone.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.RO_LLM_API_KEY || process.env.OPENAI_API_KEY || "";
const BASE_URL = (process.env.RO_LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = process.env.RO_LLM_MODEL || "gpt-4o-mini";

let SYSTEM = "تو رو هستی. درمانگر نیستی. فارسی محاوره کوتاه.";
try {
  SYSTEM = fs.readFileSync(path.join(__dirname, "system_prompt_v5.txt"), "utf8");
} catch {}

const METHOD = /روش\s*(خودکشی|آسیب)|چطور\s*(خودکشی|بکشم)/i;
const IMMINENT = /امشب\s*(تموم|خودکشی)|نقشه‌ام\s*آماده/i;
const IDEATION = /خودکشی|می‌خوام\s*بمیرم|خودم[و\s]*بکشم|خودآزاری/i;
const MEDS = /چه\s*دارویی|قطع\s*دارو|دوز/i;
const DIAG = /تشخیص\s*بده/i;

function assess(t) {
  const flags = [];
  if (METHOD.test(t)) flags.push("method");
  if (IMMINENT.test(t)) flags.push("imminent");
  if (IDEATION.test(t)) flags.push("ideation");
  if (MEDS.test(t)) flags.push("meds");
  if (DIAG.test(t)) flags.push("diagnosis");
  let level = 0;
  if (flags.includes("method") || flags.includes("imminent")) level = 3;
  else if (flags.includes("ideation")) level = 2;
  return { level, flags };
}

function crisis(level, flags) {
  if (flags.includes("method") || level >= 3) {
    return "نمی‌تونم درباره روش آسیب حرف بزنم.\n\nاگر در خطر هستی با ۱۱۵ یا ۱۲۳ تماس بگیر و تنها نمون.";
  }
  return "سنگین به نظر می‌رسه.\nاگر به آسیب نزدیک هستی: ۱۱۵ یا ۱۲۳.\nمن اینجام بشنوم؛ جای اورژانس نیستم.";
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(ROOT, urlPath.replace(/^\/+/, "")));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function callLLM(messages) {
  if (!API_KEY) {
    const err = new Error("NO_API_KEY");
    err.code = "NO_API_KEY";
    throw err;
  }
  const r = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 400,
      messages: [{ role: "system", content: SYSTEM }, ...messages],
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error?.message || r.statusText);
  return data.choices?.[0]?.message?.content?.trim() || "…";
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, llm: Boolean(API_KEY), model: API_KEY ? MODEL : null }));
    return;
  }

  if (req.method === "POST" && req.url.startsWith("/api/chat")) {
    try {
      const payload = await readJson(req);
      const userText = String(payload.message || "").trim();
      if (!userText) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "empty" }));
        return;
      }
      const pre = assess(userText);
      if (pre.level >= 2) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply: crisis(pre.level, pre.flags), mode: "crisis", safety: pre.level, source: "safety" }));
        return;
      }
      if (pre.flags.includes("meds")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply: "دارو دست من نیست؛ با پزشکت باشه.\nاز حال‌ت اگر خواستی بگو.", mode: "boundary", safety: 0, source: "safety" }));
        return;
      }
      if (pre.flags.includes("diagnosis")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply: "تشخیص از رو چت نمی‌دم.\nبگو چی سخته.", mode: "boundary", safety: 0, source: "safety" }));
        return;
      }

      const history = Array.isArray(payload.history) ? payload.history : [];
      const messages = history
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .slice(-12)
        .map((m) => ({ role: m.role, content: String(m.content || m.text || "") }));
      messages.push({ role: "user", content: userText });

      try {
        const reply = await callLLM(messages);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply, mode: "presence", safety: 0, source: "llm", model: MODEL }));
      } catch (e) {
        if (e.code === "NO_API_KEY") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ reply: null, fallback: true, error: "NO_API_KEY" }));
          return;
        }
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e.message || e) }));
    }
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Ro http://0.0.0.0:${PORT} llm=${Boolean(API_KEY)}`);
});

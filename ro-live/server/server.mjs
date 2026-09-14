/**
 * Ro LLM Gateway — full product stack
 * Safety → Person model → Memory → RAG → LLM
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieve, formatContext, ragStats } from "./rag/retrieve.mjs";
import { assessSafety, crisisReply, postFilter, boundaryReply } from "./safety_lib.mjs";
import { logSafetyEvent, safetyLogStats } from "./safety_log.mjs";
import { emptyFormulation, updateFormulation, buildHandoff } from "./handoff.mjs";
import { matchTherapists, listTherapists } from "./matching.mjs";
import { emptyPersonModel, updatePersonModel, formatPersonContext } from "./person_model.mjs";
import {
  getMemory, setConsent, upsertMemory, clearMemory, formatMemoryForPrompt, memoryStats,
} from "./memory_store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.RO_LLM_API_KEY || process.env.OPENAI_API_KEY || "";
const BASE_URL = (process.env.RO_LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = process.env.RO_LLM_MODEL || "gpt-4o-mini";
const SYSTEM = fs.readFileSync(path.join(__dirname, "system_prompt_v5.txt"), "utf8");

const hits = new Map();
function rateLimit(ip) {
  const now = Date.now();
  let arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= 60) return false;
  arr.push(now);
  hits.set(ip, arr);
  return true;
}

const sessions = new Map();
const personSessions = new Map();
function getForm(id) {
  id = id || "default";
  if (!sessions.has(id)) sessions.set(id, emptyFormulation());
  return sessions.get(id);
}
function getPerson(id) {
  id = id || "default";
  if (!personSessions.has(id)) personSessions.set(id, emptyPersonModel());
  return personSessions.get(id);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(ROOT, urlPath.replace(/^\/+/, "")));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("forbidden");
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("not found");
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

function buildMessages(history, userText, userId, form, person) {
  const messages = (history || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant" || m.role === "ro"))
    .slice(-16)
    .map((m) => ({
      role: m.role === "ro" ? "assistant" : m.role,
      content: String(m.content || m.text || ""),
    }));
  const ragHits = retrieve(userText, 4);
  const extras = [
    formatPersonContext(person, form),
    formatMemoryForPrompt(userId),
    formatContext(ragHits),
  ].filter(Boolean);
  let userPayload = userText;
  if (extras.length) userPayload = userText + "\n\n---\n" + extras.join("\n\n");
  messages.push({ role: "user", content: userPayload });
  return { messages, ragIds: ragHits.map((c) => c.id), ragHits };
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
    return res.end();
  }

  if (req.method === "GET" && req.url.startsWith("/api/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      ok: true, phase: "product-ops", llm: Boolean(API_KEY), model: API_KEY ? MODEL : null,
      streaming: true, safetyLib: true, personModel: true, empathySkills: true, rag: ragStats(),
    }));
  }

  if (req.method === "GET" && req.url.startsWith("/api/person")) {
    const u = new URL(req.url, "http://x");
    const sessionId = u.searchParams.get("session_id") || "default";
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ session_id: sessionId, person: getPerson(sessionId), form: getForm(sessionId) }));
  }

  if (req.method === "GET" && req.url.startsWith("/api/therapists")) {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ therapists: listTherapists() }));
  }

  if (req.method === "POST" && req.url.startsWith("/api/match")) {
    try {
      const payload = await readJson(req);
      const form = getForm(payload.session_id || "default");
      const out = matchTherapists(payload.prefs || {}, { ...form, risk_level: payload.risk_level || 0 });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }

  if (req.method === "POST" && req.url.startsWith("/api/handoff")) {
    try {
      const payload = await readJson(req);
      const sessionId = String(payload.session_id || "default");
      const doc = buildHandoff({
        form: getForm(sessionId),
        riskLevel: Number(payload.risk_level || 0),
        consent: Boolean(payload.consent),
        sessionId,
      });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(doc));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }

  if (req.method === "POST" && req.url.startsWith("/api/memory/consent")) {
    try {
      const payload = await readJson(req);
      const memory = setConsent(payload.user_id || "default", Boolean(payload.consent));
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, memory }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }

  if (req.method === "POST" && req.url.startsWith("/api/session/reset")) {
    try {
      const payload = await readJson(req);
      const sessionId = String(payload.session_id || "default");
      sessions.set(sessionId, emptyFormulation());
      personSessions.set(sessionId, emptyPersonModel());
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }

  if (req.method === "POST" && req.url.startsWith("/api/chat")) {
    try {
      const payload = await readJson(req);
      const ip = req.socket.remoteAddress || "x";
      if (!rateLimit(ip)) {
        res.writeHead(429, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "rate_limited" }));
      }
      const userText = String(payload.message || "").trim();
      const history = Array.isArray(payload.history) ? payload.history : [];
      const sessionId = String(payload.session_id || payload.sessionId || "default");
      const userId = String(payload.user_id || payload.userId || sessionId);
      if (!userText) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "empty message" }));
      }

      const form = getForm(sessionId);
      updateFormulation(form, userText);
      const person = getPerson(sessionId);
      updatePersonModel(person, userText, history);

      const pre = assessSafety(userText, history);
      if (pre.level < 2) {
        const bound = boundaryReply(pre.flags);
        if (bound && pre.flags.some((f) => ["meds", "diagnosis", "psychosis", "dependency", "minor_risk"].includes(f))) {
          logSafetyEvent({ level: pre.level, flags: pre.flags, source: "safety", mode: "boundary", sample: userText });
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ reply: bound, mode: "boundary", safety: pre.level, source: "safety", flags: pre.flags }));
        }
      }
      if (pre.level >= 2) {
        const reply = crisisReply(pre.level, pre.flags);
        logSafetyEvent({ level: pre.level, flags: pre.flags, source: "safety", mode: "crisis", sample: userText });
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ reply, mode: "crisis", safety: pre.level, source: "safety" }));
      }

      const { messages, ragIds, ragHits } = buildMessages(history, userText, userId, form, person);
      if (userText.length > 24) upsertMemory(userId, { theme: userText.slice(0, 80) });

      try {
        const reply = postFilter(await callLLM(messages));
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          reply, mode: "presence", safety: 0, source: "llm", model: MODEL,
          rag: ragIds, ragPreview: ragHits.map((c) => c.title),
        }));
      } catch (e) {
        if (e.code === "NO_API_KEY") {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ reply: null, fallback: true, error: "NO_API_KEY", rag: ragIds }));
        }
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: String(e.message || e) }));
      }
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }

  if (req.method === "GET") return serveStatic(req, res);
  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Ro http://0.0.0.0:${PORT} llm=${Boolean(API_KEY)} model=${MODEL}`);
});

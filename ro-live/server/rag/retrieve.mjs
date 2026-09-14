/**
 * Ro RAG v1.5.1 + iran pack
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STOP = new Set("و در به از که این را با برای یک می شود است نه تا روی اما یا اگر هم دیگه ای ها های تو من ما شما آن".split(" "));

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[‌‍]/g, "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokens(text) {
  return normalize(text).split(" ").filter((t) => t.length > 1 && !STOP.has(t));
}
function tokenMatch(a, b) {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return true;
  return false;
}
function setHasMatch(set, t) {
  if (set.has(t)) return true;
  for (const x of set) if (tokenMatch(x, t)) return true;
  return false;
}
function loadChunks() {
  const single = path.join(__dirname, "chunks.json");
  if (fs.existsSync(single)) return JSON.parse(fs.readFileSync(single, "utf8"));
  const all = [];
  for (const k of ["policy", "safety", "clinical", "skills", "product", "iran"]) {
    const f = path.join(__dirname, `chunks_${k}.json`);
    if (fs.existsSync(f)) all.push(...JSON.parse(fs.readFileSync(f, "utf8")));
  }
  return all;
}
function buildIndex(raw) {
  return raw.map((c) => {
    const search = normalize(c.search || `${c.title} ${(c.tags || []).join(" ")} ${c.text}`);
    return {
      id: c.id, title: c.title, kind: c.kind, tags: c.tags || [], text: c.text, search,
      tagSet: new Set(tokens((c.tags || []).join(" "))),
      tokenSet: new Set(tokens(search)),
    };
  });
}
const INDEX = buildIndex(loadChunks());
function detectIntent(query) {
  const q = normalize(query);
  return {
    crisis: /(خودکشی|خودآزاری|بمیرم|روش\s*آسیب|تمومش\s*کنم|روش\s*خودکشی)/.test(q),
    medsDx: /(دارو|دوز|تشخیص|قرص|روان\s*پزشک)/.test(q),
    skillAsk: /(چیکار|چه\s*کار|راهکار|آروم|نفس|کمک\s*کن|آروم\s*شم)/.test(q),
    therapy: /(تراپیست|درمانگر|جلسه|تراپی|مشاور)/.test(q),
    safetySoft: /(خطر|هذیان|صداهایی)/.test(q),
    iranLife: /(خانواده|ازدواج|آبرو|مهاجرت|اجاره|گرون|رئیس|مملکت)/.test(q),
  };
}
export function retrieve(query, k = 4, opts = {}) {
  const minScore = opts.minScore ?? 3;
  const qTokens = tokens(query);
  if (!qTokens.length) return [];
  const intent = detectIntent(query);
  const scored = [];
  for (const c of INDEX) {
    if (c.kind === "safety" && !(intent.crisis || intent.medsDx || intent.safetySoft)) continue;
    if (c.kind === "skills" && !intent.skillAsk) continue;
    if (intent.crisis && (c.kind === "clinical" || c.kind === "product" || c.kind === "skills")) continue;
    if (intent.medsDx && c.kind === "clinical") continue;
    let score = 0, tokenHits = 0;
    for (const t of qTokens) {
      if (setHasMatch(c.tokenSet, t)) { score += 2; tokenHits += 1; }
    }
    for (const t of qTokens) {
      if (setHasMatch(c.tagSet, t)) score += 5;
    }
    if (c.kind === "safety" && (intent.crisis || intent.medsDx)) score += 10;
    if (c.kind === "skills" && intent.skillAsk) score += 6;
    if (c.kind === "product" && intent.therapy) score += 5;
    if (intent.iranLife && /iran_|family|migration|money|work_humiliation|ocd_check/.test(c.id)) score += 6;
    if (qTokens.length) score += Math.round((tokenHits / qTokens.length) * 4);
    if (score < minScore) continue;
    scored.push({ score, chunk: c });
  }
  scored.sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));
  const out = [];
  const kindCount = Object.create(null);
  for (const row of scored) {
    const knd = row.chunk.kind;
    kindCount[knd] = (kindCount[knd] || 0) + 1;
    if (kindCount[knd] > 2) continue;
    out.push(row.chunk);
    if (out.length >= k) break;
  }
  return out;
}
export function formatContext(chunks, maxChars = 1100) {
  if (!chunks.length) return "";
  const header = "دانش عملیاتی رو (فقط راهنما؛ تشخیص قطعی نده؛ روش آسیب نده):\n\n";
  const parts = [];
  let used = header.length;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const block = `[${i + 1}] (${c.kind}) ${c.title}\n${c.text}`;
    if (used + block.length + 2 > maxChars && parts.length > 0) break;
    parts.push(block);
    used += block.length + 2;
  }
  return header + parts.join("\n\n");
}
export function ragStats() {
  return { version: "1.5.1-iran", chunks: INDEX.length, kinds: [...new Set(INDEX.map((c) => c.kind))] };
}
export function retrieveDebug(query, k = 4) {
  const hits = retrieve(query, k);
  return { query, hits: hits.map((h) => ({ id: h.id, kind: h.kind, title: h.title })), contextChars: formatContext(hits).length };
}

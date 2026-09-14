import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadChunks() {
  const single = path.join(__dirname, "chunks.json");
  if (fs.existsSync(single)) {
    return JSON.parse(fs.readFileSync(single, "utf8"));
  }
  const kinds = ["policy", "safety", "clinical", "skills", "product"];
  const all = [];
  for (const k of kinds) {
    const f = path.join(__dirname, `chunks_${k}.json`);
    if (fs.existsSync(f)) all.push(...JSON.parse(fs.readFileSync(f, "utf8")));
  }
  return all;
}

const CHUNKS = loadChunks();

const STOP = new Set("و در به از که این را با برای یک می شود است نه تا روی اما یا اگر".split(" "));

function tokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function retrieve(query, k = 4) {
  const q = tokens(query);
  if (!q.length) return [];
  const scored = CHUNKS.map((c) => {
    let score = 0;
    const blob = c.search || "";
    for (const t of q) {
      if (blob.includes(t)) score += 2;
    }
    for (const tag of c.tags || []) {
      const tl = String(tag).toLowerCase();
      if (q.some((t) => tl.includes(t) || t.includes(tl))) score += 5;
    }
    if (c.kind === "safety" && /(خودکشی|خودآزاری|بمیرم|خطر|دارو|تشخیص|هذیان)/.test(query)) score += 6;
    if (c.kind === "skills" && /(چیکار|راهکار|آروم|نفس|کمک کن)/.test(query)) score += 5;
    return { score, chunk: c };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return scored.map((x) => x.chunk);
}

export function formatContext(chunks) {
  if (!chunks.length) return "";
  return (
    "دانش عملیاتی رو (فقط راهنما؛ تشخیص قطعی نده):\n\n" +
    chunks.map((c, i) => `[${i + 1}] (${c.kind}) ${c.title}\n${c.text}`).join("\n\n")
  );
}

export function ragStats() {
  return { chunks: CHUNKS.length, kinds: [...new Set(CHUNKS.map((c) => c.kind))] };
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, "data", "safety_events.jsonl");

function ensure() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, "", "utf8");
}

export function logSafetyEvent(evt) {
  ensure();
  const sample = String(evt.sample || "").replace(/\d{6,}/g, "[num]").slice(0, 80);
  const row = {
    id: "se_" + crypto.randomBytes(6).toString("hex"),
    ts: new Date().toISOString(),
    level: evt.level ?? 0,
    flags: evt.flags || [],
    source: evt.source || "unknown",
    mode: evt.mode || "",
    sample_hash: crypto.createHash("sha256").update(String(evt.sample || "")).digest("hex").slice(0, 16),
    sample_redacted: sample,
  };
  fs.appendFileSync(LOG_PATH, JSON.stringify(row) + "\n", "utf8");
  return row.id;
}

export function readSafetyEvents(limit = 50) {
  ensure();
  const lines = fs.readFileSync(LOG_PATH, "utf8").trim().split("\n").filter(Boolean);
  return lines.slice(-limit).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();
}

export function safetyLogStats() {
  ensure();
  const lines = fs.readFileSync(LOG_PATH, "utf8").trim().split("\n").filter(Boolean);
  const byLevel = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const l of lines) {
    try {
      const j = JSON.parse(l);
      byLevel[String(j.level ?? 0)] = (byLevel[String(j.level ?? 0)] || 0) + 1;
    } catch {}
  }
  return { total: lines.length, byLevel };
}

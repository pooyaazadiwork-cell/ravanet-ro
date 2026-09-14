import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(__dirname, "data", "memory_store.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(STORE, "utf8"));
  } catch {
    return {};
  }
}
function save(db) {
  const dir = path.dirname(STORE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(db, null, 2), "utf8");
}
function userRec(db, userId) {
  const id = userId || "anon";
  if (!db[id]) db[id] = { consent: false, themes: [], notes: [], updatedAt: null };
  return db[id];
}
export function getMemory(userId) {
  const db = load();
  return userRec(db, userId);
}
export function setConsent(userId, consent) {
  const db = load();
  const u = userRec(db, userId);
  u.consent = Boolean(consent);
  if (!u.consent) {
    u.themes = [];
    u.notes = [];
  }
  u.updatedAt = new Date().toISOString();
  save(db);
  return u;
}
export function upsertMemory(userId, patch = {}) {
  const db = load();
  const u = userRec(db, userId);
  if (!u.consent) return u;
  if (patch.theme) {
    const t = String(patch.theme).slice(0, 120);
    if (t && !u.themes.includes(t)) {
      u.themes.push(t);
      while (u.themes.length > 20) u.themes.shift();
    }
  }
  u.updatedAt = new Date().toISOString();
  save(db);
  return u;
}
export function clearMemory(userId) {
  const db = load();
  const u = userRec(db, userId);
  u.themes = [];
  u.notes = [];
  u.updatedAt = new Date().toISOString();
  save(db);
  return u;
}
export function formatMemoryForPrompt(userId) {
  const u = getMemory(userId);
  if (!u.consent || !u.themes.length) return "";
  return "حافظه موافقت‌شده کاربر (موضوعات):\n- " + u.themes.slice(-8).join("\n- ");
}
export function memoryStats() {
  const db = load();
  return { users: Object.keys(db).length };
}

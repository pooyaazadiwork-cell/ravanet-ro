import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const therapists = JSON.parse(fs.readFileSync(path.join(__dirname, "therapists.json"), "utf8"));

export function listTherapists() {
  return therapists.filter((t) => !t.is_pathway);
}

export function matchTherapists(prefs = {}, formulation = {}) {
  const risk = Number(formulation.risk_level || 0);
  if (risk >= 2) {
    const pathway = therapists.find((t) => t.is_pathway) || {
      id: "pathway_crisis",
      title: "ارجاع سطح بالا",
      bio: "خطر بالا: اورژانس و ارزیابی انسانی",
    };
    return { matches: [pathway], reason: "high_risk" };
  }
  const bag = [
    ...(formulation.emotions || []),
    ...(formulation.triggers || []),
    ...(formulation.facts || []),
    String(prefs.specialty || ""),
  ]
    .join(" ")
    .toLowerCase();

  const scored = therapists
    .filter((t) => !t.is_pathway)
    .map((t) => {
      let score = 1;
      for (const s of t.specialties || []) {
        if (bag.includes(s) || bag.includes(String(s).replace(/_/g, " "))) score += 3;
      }
      if (prefs.gender && t.gender === prefs.gender) score += 2;
      if (prefs.city && t.city === prefs.city) score += 1;
      return { score, t };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.t);

  return { matches: scored, reason: "specialty_heuristic" };
}

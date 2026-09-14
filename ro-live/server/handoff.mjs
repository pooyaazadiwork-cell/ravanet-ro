export function emptyFormulation() {
  return {
    presenting: "",
    facts: [],
    observations: [],
    emotions: [],
    triggers: [],
    goals: [],
    hypotheses: [],
    unknowns: [],
    risk_level: 0,
    protective: [],
  };
}

function push(arr, v) {
  if (v && !arr.includes(v)) arr.push(v);
}

export function updateFormulation(form, text) {
  const t = String(text || "");
  if (!form.presenting && t.length > 8) form.presenting = t.slice(0, 160);
  if (/خواب|بیدار/.test(t)) push(form.facts, "خواب");
  if (/اضطراب|استرس|اعصاب|نگران/.test(t)) push(form.emotions, "استرس/اضطراب");
  if (/غم|حالم\s*ب|داغون|خسته‌?م/.test(t)) push(form.emotions, "خلق پایین");
  if (/کار|پول|نمیرسم/.test(t)) push(form.triggers, "فشار زندگی/کار");
  if (/رابطه|دعوا|زید|همسر/.test(t)) push(form.facts, "رابطه");
  if (/تنها/.test(t)) push(form.facts, "تنهایی");
  return form;
}

export function buildHandoff(form, extras = {}) {
  return {
    schema: "ravanet.ro.handoff.v1",
    reason_for_visit: form.presenting || "گفتگو با رو",
    facts: form.facts || [],
    observations: form.observations || [],
    emotions: form.emotions || [],
    triggers: form.triggers || [],
    goals: form.goals || [],
    hypotheses: form.hypotheses || [],
    unknowns: form.unknowns || ["تشخیص قطعی نشده"],
    risk_level: form.risk_level || 0,
    protective_factors: form.protective || [],
    note: "این بسته تشخیص پزشکی/روان‌شناختی نیست.",
    ...extras,
  };
}

/** Working model of the person in-session — NOT diagnosis */
function push(arr, v, max = 12) {
  if (!v) return;
  if (!arr.includes(v)) arr.push(v);
  while (arr.length > max) arr.shift();
}
export function emptyPersonModel() {
  return {
    style: { register: "neutral", lengthBias: "medium", energy: "unknown" },
    themes: [],
    emotions: [],
    triggers: [],
    values_needs: [],
    already_said: [],
    avoid: [],
    relationship_to_ro: "new",
    turn: 0,
  };
}
export function updatePersonModel(model, userText) {
  const t = String(userText || "").trim();
  if (!model) model = emptyPersonModel();
  model.turn = (model.turn || 0) + 1;
  if (/کیر|تخم|ریده|گوه/.test(t)) model.style.register = "blunt";
  else if (/می‌کنم|نمی‌دونم|آره/.test(t) && t.length < 80) model.style.register = "colloquial";
  if (t.length < 40) model.style.lengthBias = "short";
  if (/عصبی|اعصاب|خشم|دعوا/.test(t)) model.style.energy = "agitated";
  else if (/خسته‌?م|حالم\s*ب/.test(t)) model.style.energy = "low";
  if (/رابطه|زید|همسر|دعوا|درک\s*نشد/.test(t)) {
    push(model.themes, "رابطه / درک‌نشدن");
    push(model.emotions, "زخم رابطه");
  }
  if (/کار|پول|نمیرسم|فرسوده/.test(t)) push(model.themes, "فشار زندگی/کار");
  if (/تنها/.test(t)) {
    push(model.themes, "تنهایی");
    push(model.emotions, "تنهایی");
  }
  if (/اضطراب|استرس|نگران/.test(t)) push(model.themes, "استرس/اضطراب");
  if (/درک/.test(t)) push(model.values_needs, "درک شدن");
  if (/می‌ترسم\s*از\s*دست|نمیخوای\s*برو/.test(t)) {
    push(model.emotions, "ترس از طرد");
    push(model.values_needs, "امنیت دلبستگی");
  }
  if (t.length > 15 && t.length < 100) push(model.already_said, t.slice(0, 80), 6);
  if (/چقدر\s*سوال|خیلی\s*سوال/.test(t)) push(model.avoid, "سؤال زیاد");
  if (/چیکار|راهکار|آروم/.test(t)) model.relationship_to_ro = "seeking_skills";
  else if (/تراپیست|درمانگر/.test(t)) model.relationship_to_ro = "seeking_therapist";
  else if (model.turn >= 2) model.relationship_to_ro = "venting";
  return model;
}
export function formatPersonContext(model, form) {
  if (!model || model.turn < 1) return "";
  const lines = ["مدل کاری این گفتگو (فرضیه است؛ تشخیص نیست؛ با لحن کاربر هماهنگ شو):"];
  if (model.style.register === "blunt") lines.push("- سبک: تند/خیابانی → خودت کتابی نشو");
  if (model.style.lengthBias === "short") lines.push("- جواب خیلی کوتاه");
  if (model.style.energy === "agitated") lines.push("- عصبی است → آروم؛ بازجویی نکن");
  if (model.style.energy === "low") lines.push("- انرژی پایین → کوتاه؛ فشار مثبت‌بودن نگذار");
  if (model.themes.length) lines.push("- مضمون‌ها: " + model.themes.slice(-5).join("، "));
  if (model.emotions.length) lines.push("- حس‌ها: " + model.emotions.slice(-5).join("، "));
  if (model.values_needs.length) lines.push("- نیاز احتمالی: " + model.values_needs.slice(-4).join("، "));
  if (model.already_said.length) lines.push("- قبلاً گفته (دوباره نپرس): " + model.already_said.slice(-3).join(" | "));
  if (model.avoid.length) lines.push("- پرهیز: " + model.avoid.join("، "));
  if (form?.presenting) lines.push("- آغاز: " + String(form.presenting).slice(0, 120));
  if (model.relationship_to_ro === "venting") lines.push("- دردِدل: حضور؛ سؤال کم");
  if (model.relationship_to_ro === "seeking_skills") lines.push("- راهکار خواسته");
  if (model.relationship_to_ro === "seeking_therapist") lines.push("- مسیر درمانگر؛ جایش نباش");
  lines.push("- پیوسته باش؛ قطعیت تشخیصی نده.");
  return lines.join("\n");
}

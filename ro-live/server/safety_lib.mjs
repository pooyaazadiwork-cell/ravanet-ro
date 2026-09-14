/** Ro Safety v2 */
export const RESOURCES_IR = { emergency: "115", social: "123", note: "اورژانس ۱۱۵ · اورژانس اجتماعی ۱۲۳" };

const PATTERNS = {
  method: /(روش\s*(خودکشی|آسیب)|چطور\s*(خودکشی|بکشم|تموم)|نحوه\s*خودکشی|how to (kill myself|suicide|self[-\s]?harm)|بهترین\s*روش\s*(مردن|خودکشی)|قرص.*(چقدر|چند\s*تا).*بمیر)/i,
  imminent: /(امشب\s*(تموم|خودکشی)|تصمیمم\s*قطعی|نقشه‌ام\s*آماده|الان\s*می‌خوام\s*(تموم|بکشم)|پرتاب\s*از|وصیت.*نوشتم)/i,
  ideation: /(خودکشی|خودم[و\s]*بکشم|می‌خوام\s*بمیرم|میخوام\s*بمیرم|کاش\s*(نبودم|بیدار\s*نمی|صبح\s*بیدار)|خودآزاری|تمومش\s*کنم|نمی‌خوام\s*زند[هه‌]\s*باشم)/i,
  harm_others: /(می‌کشم(ش|شون)?|میکشم(ش|شون)?|نقشه\s*(قتل|آسیب\s*به))/i,
  psychosis: /(از\s*طریق\s*گوشی\s*کنترل|صداهایی\s*که\s*(می‌گن|میگن)|تراشه\s*کاشتن)/i,
  meds: /(چه\s*دارویی|دوز\s*(رو|را)\s*(کم|زیاد|قطع)|قطع\s*دارو|دارو\s*تجویز|آرام‌?بخش\s*بده)/i,
  diagnosis: /(تشخیص\s*بده|بگو\s*من\s*چی\s*دارم)/i,
  dependency: /(فقط\s*تو|جای\s*همه|ترکم\s*نکن|بدون\s*تو\s*نمی‌تونم)/i,
  minor_risk: /(من\s*(نوجوان|بچه|کودک)|آزار\s*(جنسی|جسمی)|کتک\s*(می‌خور|میخورم|خوردم)|مدرسه.*کتک)/i,
};

export function assessSafety(text, history = []) {
  const t = String(text || "");
  const flags = [];
  for (const [k, re] of Object.entries(PATTERNS)) {
    if (re.test(t)) flags.push(k);
  }
  let level = 0;
  if (flags.includes("method") || flags.includes("imminent") || flags.includes("harm_others")) level = 3;
  else if (flags.includes("ideation")) level = 2;
  else if (/ناامید|تحمل\s*نمی|فروپاش/.test(t)) level = 1;
  const recent = (history || []).filter((m) => PATTERNS.ideation.test(String(m.content || m.text || ""))).length;
  if (level < 3 && recent >= 2) level = Math.max(level, 2);
  return { level, flags, blockExplore: level >= 2 };
}

export function crisisReply(level, flags = []) {
  if (flags.includes("method")) {
    return `نمی‌تونم دربارهٔ روش آسیب یا خودکشی چیزی بگم.\n\nاگر الان در خطر هستی با ${RESOURCES_IR.emergency} یا ${RESOURCES_IR.social} تماس بگیر. اگر می‌تونی پیش کسی باش.`;
  }
  if (level >= 3) {
    return `از حرف‌هات نگران ایمنی‌تم.\n\nاولویت: ${RESOURCES_IR.emergency} / ${RESOURCES_IR.social} — تنها نمون.\nمن اورژانس نیستم و روش نمی‌دم.`;
  }
  return `سنگین به نظر می‌رسه.\nاگر به آسیب نزدیک هستی با ${RESOURCES_IR.emergency} یا ${RESOURCES_IR.social} تماس بگیر.\nمن می‌شنوم‌ت؛ جای کمک فوری انسانی رو نمی‌گیرم.`;
}

export function minorRiskReply() {
  return `متوجه شدم ممکنه موضوع حساس یا مرتبط با سن پایین/آزار باشه.\n\nجزئیات آسیب رو کندوکاو نمی‌کنم.\nاگر در خطر هستی با ${RESOURCES_IR.emergency} یا ${RESOURCES_IR.social} تماس بگیر و اگر می‌تونی به بزرگسال قابل‌اعتماد بگو.\nمتن نهایی این مسیر باید با مشاور حقوقی محصول یکسان بشه.`;
}

export function postFilter(reply) {
  let t = String(reply || "");
  if (/روزی\s*\d+\s*قرص|دوز را (قطع|کم|زیاد) کن|روش\s*(خودکشی|آویز)/.test(t)) {
    return "این بخش را نمی‌تونم ادامه بدم. اگر دارو یا ایمنی است: پزشک / ۱۱۵ یا ۱۲۳.";
  }
  if (/تشخیص (قطعی|تو اینه)|مبتلا به/.test(t)) {
    return "از روی چت برچسب تشخیصی قطعی نمی‌زنم.";
  }
  return t;
}

export function boundaryReply(flags) {
  if (flags.includes("minor_risk")) return minorRiskReply();
  if (flags.includes("meds")) return "دارو رو من تعیین یا قطع نمی‌کنم؛ این کار پزشک/روان‌پزشکه.";
  if (flags.includes("diagnosis")) return "تشخیص قطعی از روی چت نمی‌دم.";
  if (flags.includes("psychosis")) return "محتوا رو به‌عنوان واقعیت بیرونی تأیید نمی‌کنم. روی ایمنی می‌تونیم بمونیم.";
  if (flags.includes("dependency")) return "من تو گفتگو می‌مونم؛ جای آدم واقعی و درمانگر رو نمی‌گیرم.";
  return null;
}

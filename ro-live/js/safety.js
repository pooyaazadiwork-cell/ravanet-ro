/* Ro Safety — fast, independent pre-check */
(function (global) {
  const METHOD = /(روش\s*(خودکشی|آسیب)|چطور\s*(خودکشی|بکشم|تموم)|نحوه\s*خودکشی|how to (kill myself|suicide|self[-\s]?harm)|قرص.*(چقدر|چند تا).*بمیر)/i;
  const IMMINENT = /(امشب\s*(تموم|خودکشی)|تصمیمم\s*قطعی|نقشه‌ام\s*آماده‌ست|الان\s*می‌خوام\s*(تموم|بکشم)|پرتاب از|طناب|وصیت‌نامه.*نوشتم)/i;
  const IDEATION = /(خودکشی|خودم[و\s]*بکشم|می‌خوام\s*بمیرم|میخوام\s*بمیرم|کاش\s*(بودم|نبودم|بیدار\s*نمی)|دیگه\s*(نمی‌تونم|نمیتونم)|خودآزاری|قطع\s*کردن\s*رگ|تمومش\s*کنم|نمی‌خوام\s*زند[هه‌]\s*باشم)/i;
  const HARM_OTHER = /(می‌کشم(ش|شون)?|میکشم(ش|شون)?|نقشه\s*(قتل|آسیب\s*به)|می‌خوام\s*.*را\s*بکشم)/i;
  const PSYCHOSIS = /(از\s*طریق\s*گوشی\s*کنترل|صداهایی\s*که\s*(می‌گن|میگن)|تراشه\s*کاشتن|دولت\s*.*کنترل(م|م می‌کن))/i;
  const MEDS = /(چه\s*دارویی|دوز\s*(رو|را)\s*(کم|زیاد)|قطع\s*دارو|دارو\s*تجویز|آرام‌?بخش\s*بده)/i;
  const DIAG = /(تشخیص\s*بده|من\s*(افسردگ|اضطراب|دوقطبی|اسکیزو).*دارم\s*\?|بگو\s*من\s*چی\s*دارم)/i;

  function assess(text, history) {
    const t = String(text || "").trim();
    if (!t) return { level: 0, flags: [] };
    const flags = [];
    if (METHOD.test(t)) flags.push("method");
    if (IMMINENT.test(t)) flags.push("imminent");
    if (IDEATION.test(t)) flags.push("ideation");
    if (HARM_OTHER.test(t)) flags.push("harm_others");
    if (PSYCHOSIS.test(t)) flags.push("psychosis");
    if (MEDS.test(t)) flags.push("meds");
    if (DIAG.test(t)) flags.push("diagnosis");

    let level = 0;
    if (flags.includes("method") || flags.includes("imminent") || flags.includes("harm_others")) level = 3;
    else if (flags.includes("ideation")) level = 2;
    else if (/ناامید|تحمل\s*نمی|فروپاش|خیلی\s*بد(ه|ه\s*حالم)/i.test(t)) level = 1;

    if (level < 3 && history) {
      const recent = history.slice(-8).filter((m) => m.role === "user" && IDEATION.test(m.text)).length;
      if (recent >= 2) level = Math.max(level, 2);
    }
    return { level, flags };
  }

  function crisisReply(level, flags) {
    if (flags.includes("method")) {
      return "نمی‌تونم دربارهٔ روش آسیب یا خودکشی چیزی بگم.\n\nاگر الان در خطر هستی، لطفاً همین حالا با ۱۱۵ یا ۱۲۳ تماس بگیر. اگر می‌تونی پیش کسی باش.\n\nاگر خواستی از حس سنگینی‌ت بگو — بدون جزئیات آسیب — اینجام.";
    }
    if (level >= 3) {
      return "از حرف‌هات نگران ایمنی‌تم.\n\nاولویت الان کمک واقعی انسانیه:\n• ۱۱۵\n• ۱۲۳\n• تنها نمون\n\nمن اورژانس نیستم؛ اما نمی‌خوام این لحظه رو تنها بگذرونی.";
    }
    return "سنگین به نظر می‌رسه. ممنون که گفتی.\n\nالان به آسیب زدن به خودت نزدیک هستی؟\n\nاگر بله یا مطمئن نیستی: ۱۱۵ یا ۱۲۳. لازم نیست اینو تنها حمل کنی.";
  }

  global.RoSafety = { assess, crisisReply };
})(window);

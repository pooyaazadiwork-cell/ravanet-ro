/* Ro Engine v5 */
(function (global) {
  var S = { messages: [], memory: { goals: [] }, form: { presenting: "", facts: [], emotions: [], triggers: [], goals: [] }, safetyLevel: 0, turn: 0, userTurns: 0, thread: null, questionsInRow: 0 };
  function push(a, v) { if (v && a.indexOf(v) === -1) a.push(v); }
  function wantsHelp(t) { return /چیکار\s*کنم|چه\s*کار\s*کنم|راهکار|آروم\s*شم|کمک\s*کن/.test(t); }
  function updateForm(text) {
    var f = S.form;
    if (!f.presenting && text.length > 8) f.presenting = text.slice(0, 120);
    if (/خواب|بیدار/.test(text)) { push(f.facts, "خواب"); S.thread = "sleep"; }
    if (/اضطراب|استرس|اعصاب|نگران/.test(text)) { push(f.emotions, "استرس"); S.thread = S.thread || "stress"; }
    if (/غم|حالم\s*ب|داغون|تخم|خسته‌?م/.test(text)) { push(f.emotions, "حال بد"); S.thread = S.thread || "mood"; }
    if (/کار|پول|نمیرسم|مملکت/.test(text)) { push(f.triggers, "فشار زندگی/کار"); S.thread = "life"; }
    if (/رابطه|زید|دعوا|همسر|دوست/.test(text)) { push(f.facts, "رابطه"); S.thread = "relation"; }
    if (/تنها/.test(text)) { push(f.facts, "تنهایی"); S.thread = "lonely"; }
  }
  function matchSuggestion() {
    var bag = (S.form.facts || []).join(" ") + " " + (S.thread || "");
    if (/relation|رابطه/.test(bag)) return { title: "درمانگر روابط", why: "اگر درد اصلیش بین دو نفره این مسیر بیشتر می‌خوره." };
    if (/stress|استرس/.test(bag)) return { title: "درمانگر اضطراب", why: "برای اعصاب و استرس مداوم گزینه‌ی رایجیه." };
    if (/life|کار/.test(bag)) return { title: "روان‌درمانگر", why: "برای فشار زندگی و گیر کردن می‌تونه کمک باشه." };
    return { title: "روان‌درمانگر امن", why: "اول باید ببینی با کی راحت‌تری." };
  }
  function helpOptions(text) {
    if (/استرس|اعصاب|آروم|اضطراب/.test(text) || S.thread === "stress") {
      return "باشه یه کم بیایم پایین.\n\n۱) یه نفس عمیق همین الان\n۲) بگو دقیقاً کدوم فکرت داره می‌چرخه\n۳) یه کار کوچیک انجام بده از سر جات بلند شی\n\nکدومش برات ساده‌تره؟";
    }
    if (S.thread === "relation") {
      return "اوکی، عملی بگم:\n\n۱) فعلاً بحث رو ادامه نده تا کمی سرد شی\n۲) برای خودت بنویس اون حرف دقیقاً چی بود\n۳) اگر خواستی بریم سمت درمانگر روابط\n\nکدوم؟";
    }
    return "اوکی.\n\n۱) بگو سنگین‌ترین تکه‌ش چیه\n۲) یه نفس و ۳۰ ثانیه وایسا\n۳) اگر خواستی بریم سمت کمک تخصصی\n\nکدوم؟";
  }
  function vent(text) {
    if (/کیرم\s*تو\s*این\s*مملکت|نمیرسم|هرچی\s*کار/.test(text)) { S.thread = "life"; return "آره می‌فهمم چی می‌گی.\nهرچی می‌ری انگار به جایی بند نمی‌شی."; }
    if (/کیریه|کیری\s*ه|دنیا/.test(text)) return "آره… گاهی واقعاً همه‌ش کیری به نظر می‌رسه.\nاینجام.";
    if (/حالم\s*(خیلی\s*)?بده|داغون|تخم|ریده/.test(text)) return "سخته.\nاینجام، لازم نیست قشنگش کنی.";
    if (/اعصاب|عصبی/.test(text)) return "معلومه اعصابت پره.\nبگو چی ریخته روش.";
    if (/دعوا|زید|همسر|دوستم/.test(text)) { S.thread = "relation"; return "دعوا با یکی که نزدیکته کل روز آدم رو می‌گیره.\nازت برمی‌اد که هنوز روشی."; }
    if (/استاندارد|نمیخوای\s*برو|نمی‌خوای\s*برو/.test(text)) return "یعنی انداخت گردن تو که یا با استانداردشه یا بروی.\nاین حرف می‌سوزونه.";
    if (/تنهام|تنها\s*حتی/.test(text)) return "تنهایی وسط رابطه بدتره از تنها بودن.\nکنار یکی‌ای ولی حس می‌کنی کسی نیست.";
    if (/درک\s*نشد/.test(text)) return "زخمش همینه که حرف‌ت جایی ننشسته.\nاز نزدیک‌ترین آدم هم اینو بشنوی سنگین‌تره.";
    if (/خسته‌?م|کم\s*آوردم/.test(text)) return "خسته‌ای؛ نه فقط بدن، انگار از کشیدن بار.";
    if (/خواب|بیدار/.test(text)) return "شب‌ها ذهنت ول‌کن نیست.\nآره این خودش آدم رو خرد می‌کنه.";
    if (/نمی‌دونم|نمیدونم/.test(text)) return "اشکال نداره از کجا شروع کنی رو ندونی.\nهمین‌که نوشتی کافیه.";
    return null;
  }
  function intent(text) {
    if (wantsHelp(text)) return helpOptions(text);
    if (/تراپیست|روان‌شناس|درمانگر|معرفی/.test(text)) {
      var m = matchSuggestion();
      return "می‌تونم کمکت کنم نزدیک شی؛ خودم جاش نیستم.\nاز حرف‌هات بیشتر می‌خوره به: " + m.title + ".\n" + m.why;
    }
    if (/تو\s*کی|معرفی|روان‌شناس\s*من/.test(text)) return "من رو‌ام؛ همراه روانت.\nدرمانگر نیستم. اینجام بشنوم و اگر خواستی به آدم واقعی نزدیک‌ت کنم.";
    if (/چقدر\s*سوال|خیلی\s*سوال/.test(text)) { S.questionsInRow = 0; return "حق داری.\nدیگه بازجویی نمی‌کنم. اینجام."; }
    if (/فقط\s*تو|ترکم\s*نکن/.test(text)) return "می‌فهمم وقتی یکی می‌شنوه سخت می‌شه ولش کرد.\nمن اینجام تو چت؛ ولی جای آدم واقعی نمی‌شینم.";
    return null;
  }
  function generic(text) {
    var c = text.trim().replace(/\s+/g, " ");
    if (c.length > 40) c = c.slice(0, 40) + "…";
    var opts = ["«" + c + "»\nگرفتم. اینجام.", "آره، سنگینه.\nاگر بیشترش رو می‌خوای بگی بگو.", "شنیدم.\nتنها باهاش نیستی این لحظه."];
    return opts[S.turn % 3];
  }
  function reply(userText) {
    var text = String(userText || "").trim();
    var safety = global.RoSafety.assess(text, S.messages);
    S.safetyLevel = safety.level; S.turn += 1; S.userTurns += 1;
    S.messages.push({ role: "user", text: text });
    if (safety.level >= 2) {
      var outC = global.RoSafety.crisisReply(safety.level, safety.flags);
      S.messages.push({ role: "ro", text: outC });
      return { text: outC, mode: "crisis", safety: safety };
    }
    if (safety.flags && safety.flags.indexOf("meds") !== -1) {
      var bm = "دارو دست من نیست؛ باید با پزشکت باشه.\nاز خود حال‌ت اگر خواستی بگو.";
      S.messages.push({ role: "ro", text: bm });
      return { text: bm, mode: "boundary", safety: safety };
    }
    if (safety.flags && safety.flags.indexOf("diagnosis") !== -1) {
      var bd = "برچسب تشخیصی از رو چت نمی‌زنم.\nبگو چی برات سخته.";
      S.messages.push({ role: "ro", text: bd });
      return { text: bd, mode: "boundary", safety: safety };
    }
    updateForm(text);
    var out = intent(text) || vent(text) || generic(text);
    S.messages.push({ role: "ro", text: out });
    return { text: out, mode: "presence", safety: safety };
  }
  function handoff() {
    var m = matchSuggestion();
    return { reason: S.form.presenting || "گفتگو با رو", facts: S.form.facts, emotions: S.form.emotions, triggers: S.form.triggers, goals: S.form.goals, risk_level: S.safetyLevel, match: m, note: "تشخیص نیست." };
  }
  function reset() {
    S.messages = []; S.form = { presenting: "", facts: [], emotions: [], triggers: [], goals: [] }; S.safetyLevel = 0; S.turn = 0; S.userTurns = 0; S.thread = null; S.questionsInRow = 0;
  }
  global.RoEngine = { reply: reply, handoff: handoff, reset: reset, getState: function () { return S; } };
})(window);

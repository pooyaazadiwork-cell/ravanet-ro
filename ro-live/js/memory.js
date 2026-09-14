(function (global) {
  const KEY = "ro_memory_v5";
  const CONSENT_KEY = "ro_memory_consent_v5";
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{"goals":[],"notes":[],"themes":[]}');
    } catch {
      return { goals: [], notes: [], themes: [] };
    }
  }
  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  function getConsent() {
    return localStorage.getItem(CONSENT_KEY) === "1";
  }
  function setConsent(on) {
    localStorage.setItem(CONSENT_KEY, on ? "1" : "0");
    if (!on) save({ goals: [], notes: [], themes: [] });
  }
  function addTheme(text) {
    if (!getConsent()) return;
    const d = load();
    const t = String(text || "").slice(0, 120);
    if (t && !d.themes.includes(t)) {
      d.themes.push(t);
      while (d.themes.length > 20) d.themes.shift();
      save(d);
    }
  }
  function clear() {
    save({ goals: [], notes: [], themes: [] });
  }
  global.RoMemory = { load, save, getConsent, setConsent, addTheme, clear };
})(window);

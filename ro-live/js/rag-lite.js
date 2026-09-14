(function (global) {
  const INDEX = [
    { keys: /خودکشی|بمیرم|خودآزاری/, id: "safety_crisis" },
    { keys: /دارو|تشخیص/, id: "safety_meds_dx" },
    { keys: /وسواس|خاطر جمع/, id: "ocd" },
    { keys: /تروما|کابوس/, id: "trauma" },
    { keys: /اضطراب|استرس|اعصاب/, id: "anxiety" },
    { keys: /غم|افسرده|حال\s*بد/, id: "dep_mood" },
    { keys: /رابطه|دعوا|زید|درک/, id: "relationships" },
    { keys: /خواب/, id: "sleep" },
    { keys: /کار|فرسوده/, id: "burnout" },
    { keys: /تراپیست|درمانگر/, id: "matching" },
    { keys: /چیکار|راهکار|آروم|نفس/, id: "skills_lowrisk" }
  ];
  global.RoRagLite = {
    hitIds: function (text) {
      return INDEX.filter((x) => x.keys.test(text || "")).map((x) => x.id);
    }
  };
})(window);

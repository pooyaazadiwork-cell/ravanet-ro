# وضعیت همگام‌سازی گیت — 2026-09-14

## انجام شد در این sync
- `ro-live/server/server.mjs` → **نسخه کامل محصول** (Safety + Person + RAG + Memory + Handoff + Match)
- `chunks_skills.json` → ۱۵ مهارت شامل همدلی و رفتاری
- قبلاً: person_model, retrieve v1.5, safety_lib, system_prompt_v5, app session_id, docs

## منبع حقیقت
- لوکال / سورس‌باکس: کامل‌ترین
- ریپو بعد از این commit: برای clone و اجرا کافی است

```bash
cd ro-live/server && node server.mjs
```

RAG: `retrieve.mjs` از `chunks.json` یا `chunks_*.json` بارگذاری می‌کند.
اگر `chunks.json` یکجا نبود، kind-files کافی است (۵۷ مفهوم روی لوکال؛ skills کامل روی گیت).

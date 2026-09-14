# روان‌ت × رو (Ravanet Ro)

همراه AI سلامت روان — **جایگزین درمانگر نیست**؛ پل به درمانگر انسان است.

## اجرا روی لپ‌تاپ

نیاز: Node.js 18+

```bash
cd ro-live/server
node server.mjs
```

مرورگر: http://127.0.0.1:8787

### مدل اختیاری (Ollama)

```bash
export RO_LLM_BASE_URL=http://127.0.0.1:11434/v1
export RO_LLM_API_KEY=ollama
export RO_LLM_MODEL=llama3.2
node server.mjs
```

بدون مدل هم Safety / RAG / Handoff / Matching کار می‌کند.

## ساختار

- `ro-live/` کد اجرایی
- `docs/` دانش، پرامپت، رودمپ

## مرزها

- بدون تشخیص قطعی / بدون تجویز دارو / بدون روش آسیب
- بحران: ۱۱۵ و ۱۲۳ (ایران)

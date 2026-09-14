# رو (Ro) — همراه روان‌ت

جایگزین درمانگر نیست. پل به درمانگر انسان است.

## اجرای ۳۰ دقیقه‌ای روی لپ‌تاپ

### پیش‌نیاز
- Node.js 18+

### بدون مدل (موتور محلی)
```bash
cd server
node server.mjs
```
باز کردن: http://127.0.0.1:8787

### با Ollama (پیشنهادی برای تست کیفیت)
```bash
ollama pull llama3.2
export RO_LLM_BASE_URL=http://127.0.0.1:11434/v1
export RO_LLM_API_KEY=ollama
export RO_LLM_MODEL=llama3.2
cd server && node server.mjs
```

### با API ابری
```bash
export RO_LLM_API_KEY=sk-...
export RO_LLM_BASE_URL=https://api.openai.com/v1
export RO_LLM_MODEL=gpt-4o-mini
cd server && node server.mjs
```

## تست
```bash
cd server
node eval_full.mjs
curl -s http://127.0.0.1:8787/api/health
```

## Docker
```bash
docker compose up --build
```

## مرزها
بدون تشخیص قطعی، بدون دارو، بدون روش آسیب. بحران: ۱۱۵ / ۱۲۳

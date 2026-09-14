# ساخت chunks.json کامل (46 قطعه)

اگر `chunks.json` یا `chunks_*.json` را نداری:

```bash
# از سورس‌باکس:
# کپی RO_SOURCE_BOX/02_code/ro-live/server/rag/chunks.json

# یا از partهای base64 (اگر آپلود شده باشند):
cat chunks.b64.part* | base64 -d > chunks.min.json
node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('chunks.min.json','utf8')); fs.writeFileSync('chunks.json', JSON.stringify(j,null,2));"
```

`retrieve.mjs` یا `chunks.json` را می‌خواند یا همه `chunks_KIND.json`.

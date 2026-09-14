# Full sync restore

This pack mirrors local `ro-live` (server full, RAG 57, person model, app, docs).

```bash
cd ravanet-ro
cat sync/part*.b64 | base64 -d > /tmp/ro-live-full.tgz
# extract into repo root (paths inside tar are relative to ro-live contents)
mkdir -p ro-live
tar xzf /tmp/ro-live-full.tgz -C ro-live
cd ro-live/server && node server.mjs
```

macOS: `base64 -D` if needed.

After restore, `ro-live/server/server.mjs` is the full ~17KB gateway.

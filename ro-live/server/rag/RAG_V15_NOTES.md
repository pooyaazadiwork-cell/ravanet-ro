# RAG v1.5.1

- Pre-tokenized index at load
- Persian normalize + prefix match (خوابم→خواب)
- Intent gates: safety / skills / crisis / meds
- minScore + max 2 per kind
- Context budget ~1100 chars
- retrieveDebug() for ops

Eval: hard_fails=0
Next: embedding hybrid (v2)

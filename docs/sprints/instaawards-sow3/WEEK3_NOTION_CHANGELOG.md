# ArcusX × Instawards — SOW 3 · Week 3 Changelog

**Date:** 2026-09-24  
**Engagement:** Instawards SOW 3 — agentic payments foundation  
**Status:** Week 3 complete (E2E demo + docs; live hashes when secrets present)

---

## Summary

Week 3 ships the **Node agent E2E path** and reproduction docs on top of Week 2 prepare/confirm:

- `createKeypairWalletAdapter` for signing without Freighter
- `demo:sow3:week3` / `smoke:sow3:week3` (dry + optional live)
- Quickstart + known limitations

---

## Delivered

| Item | Path |
|------|------|
| Week 3 packet | `INSTAAWARDS_SOW3_WEEK3.md` |
| Quickstart | `AGENTIC_QUICKSTART.md` |
| Limitations | `KNOWN_LIMITATIONS.md` |
| Smoke / demo | `scripts/smoke-sow3-week3.mjs` · `demo-sow3-week3.mjs` |
| SDK helper | `packages/arcusx-sdk/src/wallet/keypair.ts` |

---

## Reproduce

```bash
cd packages/arcusx-sdk
npm run smoke:sow3:week3
npm run demo:sow3:week3
```

---

## Explicitly out of Week 3

- Mainnet
- Fresh-clone freeze + Expert evidence pack (**Week 4**)
- Multi-release / nested subjob graphs

---

**Maintainer:** ArcusX · Instawards SOW 3 track

# ArcusX × Instawards — SOW 3 · Week 2 Changelog

**Date:** 2026-09-24  
**Engagement:** Instawards Statement of Work (SOW 3) — agentic payments foundation  
**Status:** Week 2 complete (fund/release prepare-confirm + SDK + Node skeleton · smoke 10/10 · Edge v130)

---

## Summary

SOW 3 Week 2 exposes the **machine-callable fund and release path** on top of Week 1 jobs:

- `POST /v1/subjobs/{id}/escrow/fund/prepare|confirm`
- `POST /v1/subjobs/{id}/escrow/release/prepare|confirm`
- `POST /v1/subjobs/{id}/work-started`
- Typed SDK methods + `Idempotency-Key`
- Node demo skeleton (unsigned XDR or typed 4xx; **no** Freighter required)

On-chain funded/released hashes remain **Week 3**.

---

## Delivered

| Item | Path |
|------|------|
| Week 2 packet | `docs/sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK2.md` |
| Smoke | `scripts/smoke-sow3-week2.mjs` · `npm run smoke:sow3:week2` |
| Demo skeleton | `scripts/demo-sow3-week2.mjs` · `npm run demo:sow3:week2` |
| SDK module | `packages/arcusx-sdk/src/modules/agent.ts` |
| Orchestration (sign later) | `packages/arcusx-sdk/src/agent/tw-payment.ts` (`fundSubjob` / `releaseSubjob`) |
| OpenAPI | `docs/sdk/openapi-v1.yaml` (400s, work-started, Idempotency-Key) |
| Visual harness | `local-test/src/AgenticPaymentsDemo.tsx` |
| Edge auth fix | `handlers/require.ts` — partner key on nested escrow prepare |

---

## Reproduce

```bash
cd packages/arcusx-sdk && npm run smoke:sow3:week2
npm run demo:sow3:week2
```

---

## Explicitly out of Week 2

- Freighter / `WalletAdapter` signed confirm (Week 3)
- Full create → fund → complete → release hashes
- Mainnet
- `releaseOnCallback` / multi-agent graphs

---

**Maintainer:** ArcusX · Instawards SOW 3 track

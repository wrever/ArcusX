# Instawards — SDK Week 4 deliverable (SOW 2)

**Track:** `@arcusx/sdk` — Production-Ready TypeScript SDK  
**Week:** 4 of 4  
**Status:** Complete  
**Network:** Stellar **Testnet** only  
**SOW source:** [`docs/sprints/SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md)  
**Prerequisite:** [Week 3](./INSTAAWARDS_SDK_WEEK3.md) · [Week 3 changelog](./WEEK3_NOTION_CHANGELOG.md)  
**Reviewer changelog:** [`WEEK4_NOTION_CHANGELOG.md`](./WEEK4_NOTION_CHANGELOG.md)

---

## Goal

Close SOW 2 with a **Testnet release package**: fresh-clone verification, finalized docs, module status, E2E demo notes, SDK changelog (**v0.5.0**), and a mainnet readiness document marked as **future work** — not a production launch.

---

## Planned work → done

| Planned (SOW §Week 4) | Evidence |
|-----------------------|----------|
| Resolve Week 2 / Week 3 test findings | Partner release = client approve → release (marketplace parity) |
| Fresh-clone verification | [`docs/sdk/FRESH_CLONE_VERIFICATION.md`](../../sdk/FRESH_CLONE_VERIFICATION.md) |
| Finalize quickstart, API reference, limitations, demo notes | Docs under `docs/sdk/` + [`E2E_DEMO_NOTES.md`](../../sdk/E2E_DEMO_NOTES.md) |
| Mainnet checklist as future work only | [`docs/sdk/MAINNET_READINESS.md`](../../sdk/MAINNET_READINESS.md) |
| Assemble release package | This packet + [`WEEK4_NOTION_CHANGELOG.md`](./WEEK4_NOTION_CHANGELOG.md) + `@arcusx/sdk@0.5.0` |

---

## Expected output — checklist

- [x] Release candidate builds; smoke/examples documented for Testnet
- [x] Quickstart, API reference, changelog, examples, playground, known limitations, E2E notes
- [x] Module / endpoint status list
- [x] Fresh-clone verification steps
- [x] Mainnet readiness = **documentation only** (no launch)

---

## Verify

```bash
cd packages/arcusx-sdk && npm install && npm run build
npm run smoke:strict
npm run demo:week4
```

Full path: [`FRESH_CLONE_VERIFICATION.md`](../../sdk/FRESH_CLONE_VERIFICATION.md).

---

## Out of scope

- Mainnet production launch  
- Agent modules · Python SDK · native Soroban escrow swap  
- Freighter bundled as required `@arcusx/sdk` dependency  

---

## Links

| Resource | Path |
|----------|------|
| Reviewer changelog | [`WEEK4_NOTION_CHANGELOG.md`](./WEEK4_NOTION_CHANGELOG.md) |
| Fresh clone | [`docs/sdk/FRESH_CLONE_VERIFICATION.md`](../../sdk/FRESH_CLONE_VERIFICATION.md) |
| Module status | [`docs/sdk/MODULE_STATUS.md`](../../sdk/MODULE_STATUS.md) |
| E2E demo notes | [`docs/sdk/E2E_DEMO_NOTES.md`](../../sdk/E2E_DEMO_NOTES.md) |
| Mainnet (future) | [`docs/sdk/MAINNET_READINESS.md`](../../sdk/MAINNET_READINESS.md) |
| Known limitations | [`docs/sdk/KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) |
| Partner escrow | [`docs/sdk/PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md) |

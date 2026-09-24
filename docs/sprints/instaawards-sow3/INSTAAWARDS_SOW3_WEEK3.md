# Instawards — SOW 3 Week 3 deliverable

**Track:** Agentic payments — Node E2E demo + docs package  
**Week:** 3 of 4 (SOW 3 follow-on)  
**Status:** Complete (closed dry path; on-chain hashes when `PAYER_SECRET_KEY` set → Week 4)  
**Date:** 2026-09-24 · **Re-verified:** 2026-09-24  
**Release:** [v3.8.2](https://github.com/wrever/ArcusX/releases/tag/v3.8.2)  
**Edge:** `arcusx-api` **v131** · Gateway `https://api.arcusx.pro`  
**SOW source:** [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)  
**Changelog:** [`WEEK3_NOTION_CHANGELOG.md`](./WEEK3_NOTION_CHANGELOG.md)  
**Prerequisite:** [`INSTAAWARDS_SOW3_WEEK2.md`](./INSTAAWARDS_SOW3_WEEK2.md)

---

## Goal this week

Finish the **machine-callable lifecycle demo** on Stellar Testnet and ship reproduction docs:

1. Node demo: create → fund → complete signal path → release (SDK only)
2. Agentic quickstart + known limitations
3. Expanded smoke (`smoke:sow3:week3`)
4. SDK changelog entry for the agentic foundation

Live **transaction hashes** require a Testnet payer secret (`PAYER_SECRET_KEY`) and an executor user id. Without them the demo/smoke run in **dry mode** (typed prepare path) — still reviewer-reproducible.

---

## Planned work → done

| Planned (SOW §5.1 Week 3) | Evidence |
|---------------------------|----------|
| Finish Node demo E2E | `scripts/demo-sow3-week3.mjs` · `npm run demo:sow3:week3` |
| Quickstart + OpenAPI notes + limitations | [`AGENTIC_QUICKSTART.md`](./AGENTIC_QUICKSTART.md) · [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) · OpenAPI (Week 2) |
| Expand smoke / demo:agentic | `scripts/smoke-sow3-week3.mjs` |
| SDK changelog | `packages/arcusx-sdk/CHANGELOG.md` |
| Keypair WalletAdapter | `createKeypairWalletAdapter` |

---

## Expected output (SOW) — checklist

- [x] Demo covers full lifecycle skeleton; **LIVE** when `PAYER_SECRET_KEY` + `AGENTIC_EXECUTOR_USER_ID` set
- [x] Docs ready for external reproduction (quickstart + limitations + env)
- [x] SDK agentic module + pay helpers + keypair adapter
- [ ] Frozen evidence hashes on Stellar Expert — **Week 4** closeout (or attach when live secrets available)

---

## Env vars

| Var | Required | Notes |
|-----|----------|--------|
| `ARCUSX_API_KEY` | Yes | Partner sandbox key |
| `ARCUSX_API_URL` | No | Default `https://api.arcusx.pro` |
| `PAYER_SECRET_KEY` | Live E2E | Stellar `S…` — never commit |
| `AGENTIC_EXECUTOR_USER_ID` | Live E2E | Links `proposal_id` for deploy/fund |
| `AGENTIC_EXECUTOR_WALLET` | No | Receiver `G…` |
| `AGENTIC_WORKER_AMOUNT` | No | Default `1` USDC |
| `SMOKE_STRICT` | No | Fail dry skip of live E2E if `1` |

Template: `packages/arcusx-sdk/.env.example`.

---

## How to verify

```bash
cd packages/arcusx-sdk
npm run build

# Dry (no secret) — always
npm run demo:sow3:week3
npm run smoke:sow3:week3

# Live E2E
# export PAYER_SECRET_KEY=S…
# export AGENTIC_EXECUTOR_USER_ID=…
SMOKE_STRICT=1 npm run smoke:sow3:week3   # requires live env when STRICT
```

### Smoke result (dry, re-verified 2026-09-24, Edge v131)

```
✓ sdk.exports — createKeypairWalletAdapter
✓ sdk.agent_pay_helpers — fundSubjob/releaseSubjob/pay
✓ agent.createJob
✓ agent.createSubjob
✓ agent.quoteEscrow
✓ agent.prepareFund_typed — 400
✓ e2e.fund_release — skipped (dry)
SOW3 Week3 smoke PASS (7 checks)
```

Evidence: [`evidence/SMOKE_WEEK3.txt`](./evidence/SMOKE_WEEK3.txt) · [`evidence/DEMO_WEEK3.txt`](./evidence/DEMO_WEEK3.txt)

---

## Architecture (Week 3 slice)

```
Node agent runtime
  → createKeypairWalletAdapter(S…)
  → client.agent.fundSubjob / releaseSubjob
       prepareDeploy → sign → confirmDeploy
       prepareFund   → sign → confirmFund   → status funded
       prepareRelease→ sign → confirmRelease → status released
  → Stellar Testnet USDC (hashes → stellar.expert)
```

---

## Acceptance criteria

- [x] `createKeypairWalletAdapter` exported from `@arcusx/sdk`
- [x] `npm run demo:sow3:week3` / `smoke:sow3:week3`
- [x] Quickstart + known limitations
- [x] Dry path green on gateway without secrets
- [x] Live path documented (secret + executor)
- [x] No secrets in git

---

## Next week (Week 4)

Fresh-clone verification, freeze Testnet hashes / Expert links, assemble closeout packet.

---

## Links

- Quickstart: [`AGENTIC_QUICKSTART.md`](./AGENTIC_QUICKSTART.md)
- Limitations: [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)
- Security: [`SECURITY_NOTES.md`](./SECURITY_NOTES.md)
- Smoke: `scripts/smoke-sow3-week3.mjs`
- Demo: `scripts/demo-sow3-week3.mjs`
- Example (legacy JWT path): `examples/sdk-node-agent/pay-subjob.mjs`

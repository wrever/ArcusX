# E2E demo notes — SOW 2 (Testnet)

**Audience:** reviewers recording or walking the demo  
**Network:** Stellar Testnet  
**Goal:** Show `@arcusx/sdk` + partner escrow without exposing internal escrow-provider credentials.

---

## Suggested run of show (8–12 min)

1. **Positioning (30s)** — ArcusX = work execution + USDC escrow on Stellar; partners use API key + SDK; wallets stay with the user.  
2. **Smoke (1–2 min)** — `cd packages/arcusx-sdk && npm run smoke:strict` → green.  
3. **Fee (30s)** — `getPlatformFee()` → **2%** total; never hardcode.  
4. **Partner harness (5–7 min)** — `cd local-test && npm run dev` → http://localhost:5200  
   - Paste sandbox API key  
   - Freighter = **client** wallet  
   - Deploy → Fund → Liberate (approve → release)  
   - Open Stellar Expert links for contract + txs  
5. **Optional Node** — `examples/sdk-node-escrow` quote-only if time is short.  
6. **Close (30s)** — Testnet complete for SOW; mainnet is a future checklist, not this demo.

---

## What to show on screen

| Shot | Evidence |
|------|----------|
| Smoke PASS log | Terminal |
| `contract_id` `C…` | local-test UI |
| Expert contract page | Browser |
| Two Freighter popups on liberate | Freighter UI |
| Status `released` | local-test badge / JSON panel |

---

## What not to claim

- Mainnet live / production GMV  
- Custodial wallets  
- Trustless Work as a partner npm dependency  
- Worker Freighter required for liberate (partner model = client signs release)

---

## Env checklist before recording

- [ ] Sandbox `axk_test_…`  
- [ ] Freighter on Testnet; client funded with Testnet USDC + XLM  
- [ ] Worker G… address filled (receiver only)  
- [ ] `npm run build` already green in `packages/arcusx-sdk`

---

## Related commands

```bash
cd packages/arcusx-sdk && npm run demo:week4
cd local-test && npm run dev
```

Docs: [`PARTNER_ESCROW.md`](./PARTNER_ESCROW.md) · [`FRESH_CLONE_VERIFICATION.md`](./FRESH_CLONE_VERIFICATION.md) · [`WEEK4_NOTION_CHANGELOG.md`](../sprints/instaawards-sdk/WEEK4_NOTION_CHANGELOG.md)

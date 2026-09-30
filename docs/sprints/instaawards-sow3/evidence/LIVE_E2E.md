# Live E2E evidence — SOW 3 Week 4 (Stellar Testnet)

**Status:** TEMPLATE — fill after one successful fund + release today  
**Network:** Testnet  
**Gateway:** `https://api.arcusx.pro`  
**Edge:** `arcusx-api` **v133**  
**Path:** machine-callable (`@arcusx/sdk` agent / `local-test` Freighter)

Do **not** paste secrets (`S…`, `axk_…`). Only public hashes and contract IDs.

---

## Run metadata

| Field | Value |
|-------|--------|
| Date (UTC) | _YYYY-MM-DD_ |
| Job / subjob id | _uuid_ |
| Task id (if any) | _n_ |
| Contract id | `C…` |
| Payer wallet (G…) | `G…` (public OK) |
| Executor wallet (G…) | `G…` (public OK) |
| Method | ☐ Node `demo:sow3:week3` · ☐ Freighter `local-test` |

---

## Transactions

| Step | Tx hash | Stellar Expert |
|------|---------|----------------|
| Deploy (optional) | | https://stellar.expert/explorer/testnet/tx/REPLACE |
| Fund | | https://stellar.expert/explorer/testnet/tx/REPLACE |
| Approve milestone | | https://stellar.expert/explorer/testnet/tx/REPLACE |
| Release | | https://stellar.expert/explorer/testnet/tx/REPLACE |

Contract: https://stellar.expert/explorer/testnet/contract/REPLACE_C…

---

## Lifecycle asserted

- [ ] Subjob / task status **funded** after fund confirm
- [ ] Milestone **approved** on-chain before release prepare
- [ ] Status **released** after release confirm
- [ ] Worker received USDC (minus platform fee) on Testnet

---

## Notes

_Sequential release (approve → release) required as of Edge v133. Do not prepare release XDR before approve is confirmed._

When filled, mark Week 4 complete in README and publish **v3.8.3**.

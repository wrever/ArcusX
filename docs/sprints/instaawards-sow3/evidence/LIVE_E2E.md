# Live E2E evidence — SOW 3 Week 4 (Stellar Testnet)

**Status:** FROZEN  
**Network:** Testnet  
**Gateway:** `https://api.arcusx.pro`  
**Edge:** `arcusx-api` **v133** (sequential approve → release)  
**Path:** machine-callable agentic (`client.agent` / Freighter `local-test`)  
**Frozen date (UTC):** 2026-09-30

Do **not** paste secrets (`S…`, `axk_…`). Only public hashes and contract IDs.

---

## Primary run (canonical closeout)

| Field | Value |
|-------|--------|
| Date (UTC) | 2026-09-30 |
| Job id | `f67c7ee8-881d-4957-9aa6-bc085ab72e22` |
| Subjob id | `bf40c11c-9edb-4de3-9e25-a1305851ebf4` |
| Task id | `172` |
| Contract id | `CDCQ4FEAUMRUDJBM7HFLOYT6TDE2QYIXJSOZDG7N6QJRDNC4L37REDOR` |
| Payer wallet (G…) | `GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5` |
| Executor wallet (G…) | `GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D` |
| Worker amount | 5 USDC |
| Subjob status | `released` |
| Method | Freighter `local-test` / agentic partner path |

### Transactions

| Step | Tx hash | Stellar Expert |
|------|---------|----------------|
| Deploy | `c1019a48a6787a128423ef0b21b667f746540b9a9c5b5dc62a86f6bf2e455f6f` | https://stellar.expert/explorer/testnet/tx/c1019a48a6787a128423ef0b21b667f746540b9a9c5b5dc62a86f6bf2e455f6f |
| Fund | `5e67c5c7cb4be3bebc3b630e68f794716eab3faae5c28f0d64bbfdf38a9962ea` | https://stellar.expert/explorer/testnet/tx/5e67c5c7cb4be3bebc3b630e68f794716eab3faae5c28f0d64bbfdf38a9962ea |
| Approve milestone | `7a145246a47a76d91836dab8cecff5e24ea0cbd2e76bf1b16216e9e9a2d01009` | https://stellar.expert/explorer/testnet/tx/7a145246a47a76d91836dab8cecff5e24ea0cbd2e76bf1b16216e9e9a2d01009 |
| Release | `b91184d9e6813a0aafdba1ad2e079b307da0c2f64b220996d11da1fde7b9a58c` | https://stellar.expert/explorer/testnet/tx/b91184d9e6813a0aafdba1ad2e079b307da0c2f64b220996d11da1fde7b9a58c |

Contract: https://stellar.expert/explorer/testnet/contract/CDCQ4FEAUMRUDJBM7HFLOYT6TDE2QYIXJSOZDG7N6QJRDNC4L37REDOR

Horizon checks (2026-09-30): fund + release `successful=true` on `horizon-testnet.stellar.org`.

### Lifecycle asserted

- [x] Subjob / task **funded** after fund confirm (`subjob.funded` domain event)
- [x] Milestone **approved** on-chain before release (approve tx between fund and release)
- [x] Status **released** after release confirm (`subjob_status=released`, task `escrow_status=completed`)
- [x] Private agentic task (`is_private_invite=true`) with linked `subjob_id`

---

## Additional agentic runs (same day, same partner)

| Task | Contract | Fund | Release |
|------|----------|------|---------|
| 171 | `CB4FIJMQ4LTMJZGDPCHZ3VOFOZTABLDPXF6MB5W7YRE5DZZMDYSN3IPB` | [eff8f7ab…](https://stellar.expert/explorer/testnet/tx/eff8f7ab221a2f9e981017af74f449f5034421255a36ff2d2a42f4ec56a8d7bc) | [ef3a26dd…](https://stellar.expert/explorer/testnet/tx/ef3a26dd48b30bf141dd20a95ebb69b74854ce0c2b4ccfe892a52df0f54d2a75) |
| 170 | `CCDQV27VYVMTEWAYGD2QJYQ3C6YJUZL5TPGWIZUVKB5PP4YVCWYFPHYF` | [23bd5866…](https://stellar.expert/explorer/testnet/tx/23bd586666384b161da7e60b5a86783764dc2b96f790ff1785726d150805b2b7) | [5eab6b5a…](https://stellar.expert/explorer/testnet/tx/5eab6b5af4f41878a8dd1e173f7910fe39fd7d0b920ecec53494b20015298ae8) |
| 169 | `CDFTZOQ7ZPT5DZUUUSVCZIFSYQTAYIERJFB7O3BTV54SC6QA4UVGHXLP` | [05c83f5f…](https://stellar.expert/explorer/testnet/tx/05c83f5fc66c1551ec442fbf72102d40b2ccf6f6dc4a4e16997764ed0f4d4b37) | [aa10c9c1…](https://stellar.expert/explorer/testnet/tx/aa10c9c198cef644308b6975acfcbfe9f1c0a4e6d3da28eb645dbaead01707d4) |

---

## Notes

Sequential release (approve → release) required as of Edge **v133**. Primary closeout run is task **172** / subjob `bf40c11c-…`.

SOW 3 Deliverable 3 evidence: **complete**.

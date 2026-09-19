# Mainnet readiness — future work (not a SOW 2 deliverable)

**Status:** Checklist only  
**SOW 2 scope:** Stellar **Testnet** verification and SDK release package  
**This document does not authorize or claim a production mainnet launch.**

Use this list when ArcusX later decides to open mainnet. Until then, all partner demos, smoke scripts, and Instawards evidence remain on **Testnet**.

---

## Preconditions (future)

| Area | Item | Notes |
|------|------|--------|
| Network | `network: 'mainnet'` / `x-arcusx-network: mainnet` | Client already accepts the flag; ops must enable Edge + provider |
| Asset | USDC issuer + trustlines (client, worker, platform) | Confirm issuer address per Stellar mainnet USDC |
| Wallets | Platform + admin / dispute resolver addresses | Rotate from Testnet G… values |
| Keys | Partner live keys (`axk_live_…`) · Edge secrets | Separate from sandbox; never reuse Testnet secrets |
| Fees | `getPlatformFee` / system config on mainnet | Do not hardcode % in apps |
| Smoke | Documented small USDC amount | Cap risk on first live smoke |
| Provider | Escrow provider mainnet credentials / base URL | Server-side only; never in partner clients |
| Rollback | Disable live keys · freeze new deploys · status page | Document owner + contact |
| Risks | Trustlines missing · fee misconfig · provider outage · wallet UX | Track before any soft launch |

---

## Explicit non-goals for SOW 2

- No mainnet GMV / “live in production” claim  
- No requirement for reviewers to fund mainnet wallets  
- No change of default SDK demos away from Testnet  

---

## Related

- [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) — mainnet launch listed as out of SOW 2  
- [`QUICKSTART.md`](./QUICKSTART.md) — Testnet vs mainnet note  
- [`FEE_MODEL.md`](./FEE_MODEL.md) — fee source of truth  

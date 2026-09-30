# Mainnet readiness — future work (not a SOW 3 deliverable)

**Status:** Checklist only  
**SOW 3 scope:** Stellar **Testnet** agentic foundation + evidence  
**This document does not authorize or claim a production mainnet launch.**

Mirror of the SOW 2 stance, scoped to the agentic path. Until ops flips network flags, all SOW 3 demos, smoke, and Instawards evidence remain on **Testnet**.

---

## Preconditions (future)

| Area | Item | Notes |
|------|------|--------|
| Network | Client `network: 'mainnet'` + Edge accept | Agentic routes currently force testnet |
| Asset | Mainnet USDC issuer + trustlines | Payer, executor, platform |
| Keys | `axk_live_…` separate from sandbox | Never reuse Testnet partner keys |
| Wallets | Platform / admin G… on mainnet | Rotate from Testnet values |
| Fees | `system_config` / quote on mainnet | Do not hardcode % |
| Provider | Escrow provider mainnet credentials | Server-side only |
| Smoke | Cap first live amount | Document owner + rollback |
| Release path | Sequential approve → release | Same as Testnet v133 |

Also see SOW 2: [`../../sdk/MAINNET_READINESS.md`](../../sdk/MAINNET_READINESS.md).

---

## Explicit non-goals for SOW 3

- No mainnet GMV / “live in production” claim  
- No requirement for reviewers to fund mainnet wallets  
- Default SDK demos stay on Testnet  

---

## Related

- [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)  
- [`AGENTIC_QUICKSTART.md`](./AGENTIC_QUICKSTART.md)  
- [`SECURITY_NOTES.md`](./SECURITY_NOTES.md)  

# Agentic foundation — known limitations (SOW 3)

Honest constraints for reviewers and integrators. **Testnet only.**

## Product / API

| Limitation | Detail |
|------------|--------|
| 1 escrow per subjob | Nested multi-agent graphs / multi-release milestones are out of MVP |
| `proposal_id` required to fund | Create subjob with `executor_user_id` (or `linkProposal`) before `fundSubjob` |
| `markWorkStarted` is executor-only | Partner payer key gets `403` — expected |
| Agentic tasks are private | `is_private_invite=true` — not listed on public marketplace board |
| Network forced to testnet | Agentic Edge actions ignore `x-arcusx-network=mainnet` |
| Confirm without XDR | Returns typed `400` — client must sign `unsigned_xdr` |

## SDK / Node demo

| Limitation | Detail |
|------------|--------|
| Live E2E needs secret | `PAYER_SECRET_KEY=S…` never shipped in git; dry mode otherwise |
| `@stellar/stellar-sdk` peer | Required only for `createKeypairWalletAdapter` |
| Freighter vs Keypair | Browser → Freighter adapter example; Node → Keypair helper |
| Attestation policies | `webhook_attestation` / `releaseOnCallback` exist but are not the Week 3 happy path |

## Ops

| Limitation | Detail |
|------------|--------|
| Partner key = owner | Treat `axk_*` as server secret ([SECURITY_NOTES](./SECURITY_NOTES.md)) |
| Rate limits | Sandbox ~60 req/min (in-memory Edge bucket) |
| Mainnet | Documented future work — not SOW 3 |

## Deferred to Week 4

- Frozen Stellar Expert links for fund + release in the evidence pack
- Fresh-clone verification checklist execution log
- Weeks 1–3 dry/API path is closed; only live on-chain evidence remains for SOW Deliverable 3

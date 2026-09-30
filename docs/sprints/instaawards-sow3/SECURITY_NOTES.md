# Security notes — SOW 3 agentic (Testnet)

Short checklist for reviewers / maintainers. Full partner auth: [`docs/sdk/PARTNER_AUTH.md`](../../sdk/PARTNER_AUTH.md).

**Status:** **SOW 3 CLOSED** · Edge live **`arcusx-api` v133** · SDK **0.5.2** · Evidence frozen 2026-09-30

## Do

- Keep `ARCUSX_API_KEY=axk_test_…` only in local `.env` (gitignored)
- Rotate any PAT or partner key pasted into chat within 24h
- Prefer `api.arcusx.pro` (gateway) over calling Edge with service role from clients
- Treat partner keys as **server secrets** (they act as the partner owner)
- Reviewers: request a sandbox `axk_test_…` from the builder / Ambassador (never commit keys)

## Do not

- Commit `.env`, `sbp_…` access tokens, or raw `axk_…` keys
- Ship Freighter-signed mainnet flows under SOW 3 (agentic network is forced testnet)
- Expect public marketplace listing for agentic subjobs (private invite tasks)
- Call `release/prepare` for both approve + release in one shot — Edge **v133** returns **one XDR per prepare** (approve first, then release)

## Edge versions (agentic path)

| Version | Change |
|---------|--------|
| v128 | Week 1 create/status |
| v130 | `requireUser` honors `partnerId` for prepare fund/release |
| v131 | Idempotency scoped per partner/user; agentic tasks always private |
| v132 | `confirmDeploy` hash / contract_id recovery from signed XDR |
| **v133** (live) | Sequential release: approve → confirm → release → confirm |

## Verify after auth changes

```bash
cd packages/arcusx-sdk
SMOKE_STRICT=1 npm run smoke:sow3:week2
npm run smoke:sow3:week4
```

Expect typed **400/403**, never **401 invalid_or_missing_token**, on prepareFund with a valid partner key.

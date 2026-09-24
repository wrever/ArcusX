# Security notes — SOW 3 agentic (Testnet)

Short checklist for reviewers / maintainers. Full partner auth: [`docs/sdk/PARTNER_AUTH.md`](../../sdk/PARTNER_AUTH.md).

**Status:** Weeks 1–3 closed · Edge live **`arcusx-api` v131** · SDK **0.5.2** · Re-verified 2026-09-24

## Do

- Keep `ARCUSX_API_KEY=axk_test_…` only in local `.env` (gitignored)
- Rotate any PAT or partner key pasted into chat within 24h
- Prefer `api.arcusx.pro` (gateway) over calling Edge with service role from clients
- Treat partner keys as **server secrets** (they act as the partner owner)

## Do not

- Commit `.env`, `sbp_…` access tokens, or raw `axk_…` keys
- Ship Freighter-signed mainnet flows under SOW 3 (agentic network is forced testnet)
- Expect public marketplace listing for agentic subjobs (private invite tasks)

## Edge versions (agentic fund path)

| Version | Change |
|---------|--------|
| v128 | Week 1 create/status |
| v130 | `requireUser` honors `partnerId` for prepare fund/release |
| **v131** (live) | Idempotency scoped per partner/user; agentic tasks always private |

## Verify after auth changes

```bash
cd packages/arcusx-sdk
SMOKE_STRICT=1 npm run smoke:sow3:week2
```

Expect typed **400/403**, never **401 invalid_or_missing_token**, on prepareFund with a valid partner key.

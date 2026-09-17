# Module & endpoint status — `@arcusx/sdk` (SOW 2 close)

**Package:** `@arcusx/sdk` **v0.5.0**  
**Default network for SOW evidence:** Stellar Testnet  
**Gateway:** `https://api.arcusx.pro` (Edge `arcusx-api`)

Legend: ✅ SOW-ready · 🟡 Available / parallel track · ❌ Out of SOW 2

---

## SDK modules

| Module | Status | Notes |
|--------|--------|-------|
| `public` | ✅ | Fee, health, network banner |
| `marketplace` | ✅ | Tasks / proposals (user JWT) |
| `private` | ✅ | Private offers |
| `deals` | ✅ | Marketplace deals (JWT) |
| `evidence` | ✅ | Milestone evidence |
| `ratings` | ✅ | Post-release ratings |
| `disputes` | ✅ | Dispute surface |
| `escrow` | ✅ | JWT escrow prepare/confirm |
| `partnerEscrow` | ✅ | API-key escrow (deploy/fund/release) |
| `partnerDeals` | ✅ | API-key payment links |
| `webhooks` | ✅ | HMAC verify helpers + delivery list |
| `settlement` | 🟡 | Helpers; prefer `escrow` / `partnerEscrow` |
| `trust` | 🟡 | Trustline helpers |
| `agent` | 🟡 | SOW 3 foundation — Week 1 create/status baseline (`docs/sprints/instaawards-sow3/`) |

---

## Partner escrow lifecycle (Testnet)

| Step | SDK | Auth |
|------|-----|------|
| Quote / fee | `public.getPlatformFee` / `partnerEscrow` quote helpers | API key |
| Deploy | `prepareDeploy` → sign → `confirmDeploy` | API key + client wallet |
| Fund | `prepareFund` → sign → `confirmFund` | API key + client wallet |
| Release | `prepareRelease` → sign approve → `confirmRelease` → `prepareRelease` → sign release → `confirmRelease` | API key + client wallet |
| Status | `get` / `list` | API key |

Release signing: **client only** (approve → release), marketplace-aligned. Worker is receiver.

---

## REST / Edge

| Surface | Status |
|---------|--------|
| REST `/v1/…` partner routes | ✅ |
| Legacy `?action=` partner escrow actions | ✅ |
| OpenAPI | `docs/sdk/openapi-v1.yaml` (core) |

Detail maps: [`REST_V1.md`](./REST_V1.md) · [`API_REFERENCE.md`](./API_REFERENCE.md)

---

## Examples

| Path | Status |
|------|--------|
| `examples/sdk-node-escrow` | ✅ |
| `examples/sdk-node-webhooks` | ✅ |
| `examples/sdk-node-award` | ✅ |
| `examples/sdk-freighter-adapter` | ✅ |
| `examples/sdk-playground` | ✅ |
| `local-test` (Freighter harness) | ✅ Testnet harness |

---

## Scripts

| Command | Status |
|---------|--------|
| `npm run smoke` / `smoke:strict` | ✅ |
| `npm run demo:week1` … `demo:week4` | ✅ |
| `npm run smoke:agentic` | 🟡 Parallel track |

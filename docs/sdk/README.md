# ArcusX SDK — documentación

**Producto:** Work Execution Layer on Stellar — misma API que usa `arcusx.pro`, empaquetada para integradores.

**SOW 2 (Instawards):** [`SOW2_DELIVERY_PLAN.md`](../sprints/SOW2_DELIVERY_PLAN.md) · [`WEEK1`](../sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK1.md) · [`WEEK2`](../sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK2.md) · [`WEEK3`](../sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK3.md) · changelogs [`W1`](../sprints/instaawards-sdk/WEEK1_NOTION_CHANGELOG.md) · [`W2`](../sprints/instaawards-sdk/WEEK2_NOTION_CHANGELOG.md) · [`W3`](../sprints/instaawards-sdk/WEEK3_NOTION_CHANGELOG.md)

| Documento | Para qué |
|-----------|----------|
| **[`QUICKSTART.md`](./QUICKSTART.md)** | Instalar, env vars, primer cliente |
| **[`API_REFERENCE.md`](./API_REFERENCE.md)** | Contrato público `@arcusx/sdk` ↔ REST `/v1/` |
| **[`PARTNER_AUTH.md`](./PARTNER_AUTH.md)** | API keys sandbox/live, JWT usuario, errores |
| [`FEE_MODEL.md`](./FEE_MODEL.md) | Comisión / no recalcular fee en el cliente |
| [`INFRA_THESIS.md`](./INFRA_THESIS.md) | **Norte producto:** escrow + deals + fee (sin login) |
| [`PARTNER_ESCROW.md`](./PARTNER_ESCROW.md) | Escrow sin JWT — API key + wallets + monto |
| [`PARTNER_DEALS.md`](./PARTNER_DEALS.md) | Payment links sin JWT |
| [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) | Límites SOW 2 / escrow / auth |
| [`REST_V1.md`](./REST_V1.md) | Mapa REST → Edge actions |
| [`openapi-v1.yaml`](./openapi-v1.yaml) | OpenAPI v1 (núcleo) |
| [`CHECKLIST.md`](./CHECKLIST.md) | Backlog histórico / infra |

**Código:** `packages/arcusx-sdk/` (`@arcusx/sdk` **v0.4.5**) · **API:** [`ENDPOINTS.md`](../api/ENDPOINTS.md)

---

## Estado (SOW 2 — Semanas 1–3)

| Capa | Estado |
|------|--------|
| Edge `arcusx-api` + REST `/v1/` | ✅ |
| Partner / user API keys (`axk_test_` / `axk_live_`) | ✅ |
| Partner gateway `https://api.arcusx.pro` | ✅ |
| `@arcusx/sdk` — contrato tipado + módulos SOW 2 | ✅ |
| Docs (README / QUICKSTART / API_REFERENCE / package README) | ✅ Semana 1–3 |
| Smoke público + invalid API key + escrow.quote | ✅ `scripts/smoke-sdk.mjs` (13 checks) |
| Award-style reference app (Semana 2) | ✅ código + `demo:week2` |
| Node examples marketplace / private / deal / award | ✅ Semana 2 |
| Escrow lifecycle + Freighter adapter + webhooks HMAC (Semana 3) | ✅ `sdk-node-escrow` · `sdk-freighter-adapter` · `sdk-node-webhooks` · `demo:week3` |
| **Partner escrow sin JWT** (API key + wallets + monto) | 🟡 código listo — migrar BD + deploy Edge (`PARTNER_ESCROW.md`) |
| Playground award→ready + rail E2E + webhooks | ✅ `examples/sdk-playground` |
| Escrow Testnet fund/release tx evidence + release package (Semana 4) | ☐ |

**Siguiente paso:** Semana 4 — release package, known limitations packaging, captura E2E on-chain si hay wallet Testnet.

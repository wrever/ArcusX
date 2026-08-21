# ArcusX SDK — documentación

**Producto:** Work Execution Layer on Stellar — marketplace en `arcusx.pro` + rail partner para apps terceras.

**Mapa completo (marketplace + partner):** [`PLATFORM_OVERVIEW.md`](./PLATFORM_OVERVIEW.md)

**SOW 2:** [`SOW2_DELIVERY_PLAN.md`](../sprints/SOW2_DELIVERY_PLAN.md) · W1–W3 packets/changelogs en `docs/sprints/instaawards-sdk/`

| Documento | Para qué |
|-----------|----------|
| **[`PLATFORM_OVERVIEW.md`](./PLATFORM_OVERVIEW.md)** | Cómo funciona ArcusX entero (rieles, fee, flujos) |
| **[`QUICKSTART.md`](./QUICKSTART.md)** | Instalar, env vars, primer cliente |
| **[`API_REFERENCE.md`](./API_REFERENCE.md)** | Contrato público `@arcusx/sdk` ↔ REST `/v1/` |
| **[`PARTNER_AUTH.md`](./PARTNER_AUTH.md)** | API keys sandbox/live, JWT usuario, errores |
| [`FEE_MODEL.md`](./FEE_MODEL.md) | Comisión 2% — no recalcular en el cliente |
| [`INFRA_THESIS.md`](./INFRA_THESIS.md) | Norte producto partner: escrow + deals + fee |
| [`PARTNER_ESCROW.md`](./PARTNER_ESCROW.md) | Escrow API key + wallets + monto (**live**) |
| [`PARTNER_DEALS.md`](./PARTNER_DEALS.md) | Payment links API key (**live**) |
| [`RAILS_SEPARATION.md`](./RAILS_SEPARATION.md) | Partner ≠ marketplace JWT |
| [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) | Límites SOW 2 / escrow / auth |
| [`REST_V1.md`](./REST_V1.md) | Mapa REST → Edge actions |
| [`openapi-v1.yaml`](./openapi-v1.yaml) | OpenAPI v1 (núcleo) |

**Código:** `packages/arcusx-sdk/` (`@arcusx/sdk` **v0.4.5**) · **API:** [`ENDPOINTS.md`](../api/ENDPOINTS.md) · **Harness:** `local-test/` (:5200)

---

## Estado (2026-08-20)

| Capa | Estado |
|------|--------|
| Edge `arcusx-api` + REST `/v1/` | ✅ |
| Partner / user API keys | ✅ |
| Gateway `https://api.arcusx.pro` | ✅ (harness puede usar Edge directo) |
| `@arcusx/sdk` módulos SOW + partner | ✅ |
| Marketplace JWT (tasks / private / deals app) | ✅ (rieles separados) |
| `partnerEscrow` + `partnerDeals` Testnet | ✅ live |
| Smoke + local-test suite + Freighter E2E | ✅ |
| W4 release package / mainnet checklist doc | ☐ |

# ArcusX SDK — documentación

**Producto:** Work Execution Layer on Stellar — misma API que usa `arcusx.pro`, empaquetada para integradores.

**SOW 2 (Instawards):** [`SOW2_DELIVERY_PLAN.md`](../sprints/SOW2_DELIVERY_PLAN.md) · evidencia Semana 1: [`INSTAAWARDS_SDK_WEEK1.md`](../sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK1.md)

| Documento | Para qué |
|-----------|----------|
| **[`QUICKSTART.md`](./QUICKSTART.md)** | Instalar, env vars, primer cliente |
| **[`API_REFERENCE.md`](./API_REFERENCE.md)** | Contrato público `@arcusx/sdk` ↔ REST `/v1/` |
| **[`PARTNER_AUTH.md`](./PARTNER_AUTH.md)** | API keys sandbox/live, JWT usuario, errores |
| [`FEE_MODEL.md`](./FEE_MODEL.md) | Comisión / no recalcular fee en el cliente |
| [`REST_V1.md`](./REST_V1.md) | Mapa REST → Edge actions |
| [`openapi-v1.yaml`](./openapi-v1.yaml) | OpenAPI v1 (núcleo) |
| [`CHECKLIST.md`](./CHECKLIST.md) | Backlog histórico / infra |

**Código:** `packages/arcusx-sdk/` (`@arcusx/sdk` **v0.4.5**) · **API:** [`ENDPOINTS.md`](../api/ENDPOINTS.md)

---

## Estado (SOW 2 — Semana 1)

| Capa | Estado |
|------|--------|
| Edge `arcusx-api` + REST `/v1/` | ✅ |
| Partner / user API keys (`axk_test_` / `axk_live_`) | ✅ |
| Partner gateway `https://api.arcusx.pro` | ✅ |
| `@arcusx/sdk` — contrato tipado + módulos SOW 2 | ✅ |
| Docs (README / QUICKSTART / API_REFERENCE / package README) | ✅ Semana 1 |
| Smoke público + invalid API key | ✅ `scripts/smoke-sdk.mjs` |
| Award-style reference app (Semana 2) | ☐ |
| Escrow Testnet E2E + release package (Semanas 3–4) | ☐ |

**Siguiente paso:** Semana 2 — award-style reference flow + ejemplos Node con SDK.

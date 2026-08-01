# Checklist — Pagos agénticos

Seguimiento de gates. Actualizar al cerrar cada ítem.

---

## Fase 0 — Planificación

- [x] Carpeta `docs/agentic-payments/` con docs base
- [x] Puntero raíz `ARCUSX_AGENTIC_PAYMENTS_PLAN.md`
- [x] Decisión **D1** host API: Supabase Edge (sin gateway PHP permanente; puente temporal OK Fase 1)
- [x] Decisión **D3** 1 escrow por **subjob** (implementado)
- [x] OpenAPI v0.1 con paths Agentic en [`../sdk/openapi-v1.yaml`](../sdk/openapi-v1.yaml)
- [ ] 3 entrevistas builders agentic documentadas
- [ ] ArcusX Guard tiers en [arcusx-guard/PREMIUM.md](./arcusx-guard/PREMIUM.md)
- [x] Escrow path testnet vía **Trustless Work** (runtime actual; S1 nativo opcional)

**Gate Fase 1:** D1 + escrow TW path ✅

---

## Fase 1 — API MVP (= Agentic Week 1)

- [x] Tabla API keys / partners (`arcusx_partners`, `arcusx_partner_keys`, user keys)
- [x] Emisión/revocación keys (dashboard + `generate-partner-key.mjs`)
- [x] `POST /v1/jobs` (+ list/get/cancel)
- [x] Flujo fund → confirm (XDR) en **subjob** (`…/escrow/*/prepare|confirm`)
- [x] Flujo complete → release (approve/release + attest/callback)
- [x] `GET /v1/jobs/{id}`
- [x] Rate limit por key (`rate_limit_per_min`)
- [x] Quickstart publicado ([`QUICKSTART.md`](./QUICKSTART.md))
- [x] Smoke off-chain automatizado (`scripts/smoke-agentic.mjs`) — evidencia [`AGENTIC_WEEK1.md`](./AGENTIC_WEEK1.md)
- [ ] E2E on-chain testnet en CI (manual: `examples/sdk-node-agent/pay-subjob.mjs`)
- [ ] 1 integrador piloto externo

---

## Fase 2 — Plataforma agéntica

- [x] Schema `arcusx_jobs` / `arcusx_subjobs`
- [x] `POST /v1/jobs/{id}/subjobs`
- [x] Idempotency-Key en creates / confirms / attest
- [x] SDK surface `@arcusx/sdk` → `client.agent` (no paquete `@arcusx/agentic` separado)
- [~] Webhooks registro + entrega + HMAC (emit existe; verificar deliveries E2E)
- [x] Dashboard dev keys (UI developer + `/v1/config/api-keys`)

---

## Fase 3 — Verificación automática

- [x] `verification_policy` / `completion_condition` en subjobs
- [x] `POST .../attest` + release-on-callback handlers
- [ ] Demo público agente→agente (LangGraph/CrewAI)
- [ ] ToS API publicados

---

## Fase 4 — Escala

- [ ] Backend API en escrow S2 (WASM)
- [ ] MCP tools documentadas
- [ ] KYB tier enterprise
- [ ] Contribución estándar abierto (draft spec)
- [ ] CertiX policy `certix_approved`

---

## Riesgos a monitorear

| Riesgo | Mitigación |
|--------|------------|
| Escrow nativo no desplegado | Fase 1 usa TW vía Edge ✅ |
| Dos DBs inconsistentes | Bridge `task_id` en subjobs |
| Competencia 2027 | Publicar SDK + partners en 2026 |
| Legal API pagos | Counsel antes beta abierta |

---

*Última actualización:* 2026-07-30

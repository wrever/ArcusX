# Checklist — Pagos agénticos

Seguimiento de gates. Actualizar al cerrar cada ítem.

---

## Fase 0 — Planificación

- [x] Carpeta `docs/agentic-payments/` con docs base
- [x] Puntero raíz `ARCUSX_AGENTIC_PAYMENTS_PLAN.md`
- [x] Decisión **D1** host API: Supabase Edge (sin gateway PHP permanente; puente temporal OK Fase 1)
- [ ] Decisión **D3** 1 escrow vs N por subjob
- [ ] OpenAPI v0.1 exportado desde spec
- [ ] 3 entrevistas builders agentic documentadas
- [ ] ArcusX Guard tiers en [arcusx-guard/PREMIUM.md](./arcusx-guard/PREMIUM.md)
- [ ] Escrow nativo S1: E2E testnet en verde ([escrow-native CHECKLIST](../escrow-native/CHECKLIST.md))

**Gate Fase 1:** ítems escrow + D1 cerrados.

---

## Fase 1 — API MVP

- [ ] Tabla `arcusx_api_keys` (+ migración Supabase)
- [ ] Emisión/revocación keys (admin mínimo)
- [ ] `POST /v1/jobs` (bridge PHP o PG)
- [ ] Flujo fund → confirm (XDR)
- [ ] Flujo complete → release
- [ ] `GET /v1/jobs/{id}`
- [ ] Rate limit por key
- [ ] Quickstart publicado (`docs/agentic-payments/QUICKSTART.md`)
- [ ] E2E automatizado testnet
- [ ] 1 integrador piloto

---

## Fase 2 — Plataforma agéntica

- [ ] Schema `arcusx_jobs` / `arcusx_subjobs`
- [ ] `POST /v1/jobs/{id}/subjobs`
- [ ] Webhooks registro + entrega + HMAC
- [ ] `Idempotency-Key` en fund/release
- [ ] SDK `@arcusx/agentic` alpha
- [ ] Dashboard dev (keys + logs)

---

## Fase 3 — Verificación automática

- [ ] `verification_policy` en subjobs
- [ ] `POST .../attest` + `webhook_attestation`
- [ ] `integrator_callback`
- [ ] Demo público agente→agente
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
| Escrow nativo no desplegado | Fase 1 puede usar TW vía PHP actual |
| Dos DBs inconsistentes | Bridge `legacy_task_id` + sync plan |
| Competencia 2027 | Publicar SDK + partners en 2026 |
| Legal API pagos | Counsel antes beta abierta |

---

*Última actualización:* 2026-05-18

# ArcusX SDK — Auditoría: camino a infra global de ejecución

**Fecha:** 2026-05-28  
**Pregunta:** ¿La planificación SDK v0.1 es correcta para convertir ArcusX en **infra global de ejecución de trabajo condicionado**?

**Respuesta corta:** **Sí como MVP de apertura**, con gaps explícitos y roadmap v0.2→v1 documentados. El motor Edge ya es infra; el SDK v0.1 es el **primer embalaje**. No alcanza para “global” solo — faltan webhooks, identidad server-side, evidencia/disputas en API pública, y track agéntico.

**Documentos relacionados:** [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) · [`CHECKLIST.md`](./CHECKLIST.md) · [`ENDPOINTS.md`](../api/ENDPOINTS.md) · [`docs/escrow-native/CAPABILITY_MATRIX.md`](../escrow-native/CAPABILITY_MATRIX.md)

---

## 1. El primitivo universal (lo que vendemos al mundo)

Todo caso de uso global converge en el mismo pipeline — ya implementado en Edge:

```
1. Bind work      → create_task | create_deal | create (private invite)
2. Select worker  → apply + select_proposal | accept_private | accept_deal
3. Lock funds     → create_escrow + on-chain fund | finalize_private | deal escrow
4. Execute        → mark_work_started | complete_deal (active)
5. Verify         → evidence upload | dispute (hoy UI + Edge parcial)
6. Settle         → complete_task + tx_hash | mark_deal_released
```

**Conclusión:** No hace falta reinventar el modelo mental del SDK. Los tres namespaces (`marketplace`, `private`, `deals`) + `escrow` + `settlement` **son correctos** para infra global de trabajo humano verificado.

---

## 2. Inventario Edge vs SDK v0.1 (paridad)

| Capacidad Edge (prod) | En SDK v0.1 | Gap |
|----------------------|-------------|-----|
| 83 actions en `router.ts` | 27 métodos | ✅ Intencional — solo lifecycle core |
| Idempotency (5 actions) | No documentado en SDK | 🟡 Añadir header en `http.ts` |
| `domain_events` | No expuesto | 🟡 Webhooks Fase 5 leen esto |
| Mensajería RPC Supabase | Out of band | ✅ Documentado — v0.3 o partner BYO |
| KYC / badges / portfolio | No en v0.1 | ✅ v0.2+ identity tier |
| `reset_pending_escrow` | No en SDK | ✅ Solo soporte interno |
| `get_deal_evidence` | No en v0.2 plan | 🔴 Añadir a v0.2 |
| `upload_deal_evidence` | No en v0.2 plan | 🔴 Añadir a v0.2 |
| `check_cancellation_allowed` | No en v0.1 | 🟡 v0.2 `marketplace` o `ops` |
| Cron `delete_scheduled_tasks` | No en SDK | ✅ Internal/cron only |
| Admin (`arcusx-admin`) | Fuera de SDK | ✅ Correcto |

**Veredicto paridad v0.1:** Los 27 métodos cubren el **happy path global** (publicar → ejecutar → liquidar). Correcto para primer integrador B2B.

---

## 3. Los 7 pilares de infra global

| Pilar | Estado hoy | SDK v0.1 | Para escala global |
|-------|------------|----------|-------------------|
| **1. API estable** | `?action=` only | REST `/v1/` planificado | OpenAPI + versionado |
| **2. Multi-tenant** | Sin partners | T3-01…03 | `partner_id`, `external_id`, audit |
| **3. Auth integrador** | JWT OAuth usuario | Modo A documentado | Modo B M2M v0.2; agentic v1 |
| **4. Settlement USDC** | TW testnet browser | WalletAdapter + escrow/* Fase 2c | Soroban + mainnet gate |
| **5. Verificación** | Evidence + disputas en Edge | v0.2 defer | **Crítico** para DAOs/enterprise |
| **6. Observabilidad** | `domain_events` BD | No | Webhooks Fase 5 |
| **7. Escala operativa** | Idempotency parcial | Header SDK | Rate limit partner + paginación |

---

## 4. Gaps que SÍ bloquean narrativa “infra global”

### P0 — cerrar en Tranche 3 (antes de piloto)

| Gap | Por qué bloquea | ID |
|-----|-----------------|-----|
| Sin API keys / `partner_id` | No hay tenant ni GMV atribuible | T3-01…03 |
| Sin REST `/v1/` | Backends globales no integran con `?action=` | T3-13…14 |
| SDK scaffold vacío | No hay producto empaquetado | T3-04…04b |
| OAuth bootstrap no documentado | Integrador no sabe emitir JWT usuario | **T3-19** (nuevo) |
| `Idempotency-Key` no en SDK | Retries duplican tasks en prod | **T3-20** (nuevo) |

### P1 — v0.2 (primer trimestre post-MVP)

| Gap | Por qué importa global |
|-----|------------------------|
| `evidence` + `deal.evidence` | Verificación = moat vs “solo escrow” |
| `disputes` | Confianza cross-border |
| `identity.registerWallet` | Workers sin arcusx.pro UI |
| Paginación `getTasks` / filtros | Listings grandes en embeds |
| Webhooks desde `domain_events` | Automación integrador (Zapier, n8n, agents) |

### P2 — v1 infra global (6–12 meses)

| Gap | Track |
|-----|-------|
| Modo B server-only (`external_user_id`) | Enterprise payroll |
| Agentic API `POST /v1/jobs` | [`docs/agentic-payments/`](../agentic-payments/) — **capa encima** de tasks, no reemplazo |
| Soroban default + mainnet | [`docs/escrow-native/`](../escrow-native/) |
| Multi-milestone escrow | CAPABILITY_MATRIX v2 |
| Mensajería `v1/threads` o partner BYO | Comunicación post-match |

---

## 5. Relación SDK v0.1 ↔ Agentic Payments

**No hay conflicto** si se mantiene esta jerarquía:

```
v0.1 SDK (humano verificado)
  Task / Deal / Private → escrow USDC → tx_hash

v1 Agentic API (M2M, API key only)
  Job / Subjob → mapea a task(s) internos → misma escrow/*
```

El plan agéntico en `docs/agentic-payments/ARCHITECTURE.md` es **v1+**. El SDK v0.1 no debe implementar `jobs` — solo documentar que comparten `escrow-provider` y `partner_id`.

---

## 6. Restricciones globales honestas (documentar, no esconder)

| Restricción | Hoy | Roadmap |
|-------------|-----|---------|
| Moneda | USDC Stellar only | Correcto para global remesas; no fiat on-ramp en SDK |
| Red | Testnet prod | Mainnet gate Fase 6 |
| Wallet | Usuario firma (non-custodial) | Agentic: wallet org v1 |
| Discovery | No somos Upwork | Integrador trae el match — alineado con tesis infra |
| Latencia settlement | Stellar 3–5s | Ventaja vs wire/SWIFT |
| Compliance | KYC opcional Edge | Enterprise KYB ya existe — exponer v0.2 |

---

## 7. Definition of Done — “somos infra global”

Checklist de producto (no solo SDK shipped):

- [ ] Tercero cierra ciclo completo **sin fork** UI arcusx.pro
- [ ] GMV atribuible `partner_id IS NOT NULL` ≥ $1K testnet
- [ ] Misma API que usa arcusx.pro (dogfood ≥30%)
- [ ] Integrador recibe eventos (webhook) en sandbox
- [ ] Explorer Stellar verifica release USDC
- [ ] Docs: OAuth + wallet + fee en un quickstart <2h integración
- [ ] Escrow quote unificado sin docs TW

**Hoy:** 2/7 (motor Edge + flujos E2E en marketplace). **Tranche 3 target:** 5/7.

---

## 8. Correcciones aplicadas a la planificación

| Corrección | Dónde |
|------------|-------|
| v0.2 incluye `deal.evidence` | PLAN_MAESTRO, API_REFERENCE |
| T3-19 flujo OAuth integrador | PARTNER_AUTH, QUICKSTART |
| T3-20 Idempotency-Key en SDK | CHECKLIST, API_REFERENCE |
| REST v1 = P0 no opcional | Ya corregido en INFRASTRUCTURE |
| Fee bilateral alineado | FEE_MODEL en todos los docs SDK |
| Agentic = v1+ encima de tasks | Este doc §5 |

---

## 9. Orden de ejecución validado (sin cambios)

```
Spec cerrada → T3-01 partners → T3-02 auth → T3-04 SDK core
            → T3-13 REST v1 (paralelo) → T3-04b módulos → piloto
            → v0.2 evidence/disputes/webhooks → agentic v1
```

---

## 10. Narrativa investor (infra global)

**ES:** ArcusX no compite en discovery. Empaquetamos el pipeline post-acuerdo que toda app global necesita: trabajo bound, USDC en escrow, verificación, liquidación on-chain. El SDK v0.1 abre el mismo motor que corre arcusx.pro; webhooks y API agéntica escalan a DAOs, payroll y agentes IA.

**EN:** ArcusX is the conditional work execution layer on Stellar — not a freelance marketplace. v0.1 SDK exposes task/deal lifecycle and USDC settlement; partners embed it. Global scale adds webhooks, verification APIs, and agentic M2M on the same escrow rails.

---

*Revisar tras cada fase. Si un gap P0 aparece en piloto, subirlo a CHECKLIST antes de v0.2.*

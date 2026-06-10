# Matriz de capacidades — Escrow vs roadmap comercial

Auditoría del contrato **`arcusx-escrow`** (WASM S2) + Edge S1 (TW) frente a **ArcusX Deals**, **agentic payments**, **ArcusX Guard**.

**Conclusión ejecutiva:** el contrato actual es **base sólida** para ser infraestructura global **si** la plataforma compone **varias instancias `C…`** y planifica **v2 multi-milestone**. No intentar meter todo en un solo WASM v1.

---

## 1. Lo que el contrato v1 **sí soporta** (hoy)

| Necesidad comercial | ¿On-chain v1? | Cómo |
|---------------------|---------------|------|
| Pago único al completar (Deals one-time) | ✅ | `fund` → `complete` → `approve` → `release` |
| Roles humano o agente (wallets `G…`) | ✅ | Mismas funciones; sin distinción tipo |
| **Release signer ≠ pagador** | ✅ | `roles.release_signer` ≠ `roles.approver` (alquiler, auto P2P) |
| Comisión bilateral 3% (150+150 bps) | ✅ | `client_fee_bps` + `freelancer_fee_bps` |
| Disputa + reparto | ✅ | `dispute` + `resolve` (hasta 10 destinos) |
| Admin / Guard Resolve | ✅ | `dispute_resolver` + `resolve` |
| Auditoría por trato | ✅ | `engagement_id` (64 chars) en eventos |
| Un contrato por trato / subjob / deal | ✅ | 1 deploy `C…` por engagement |
| Snapshot para indexer/API | ✅ | `get_snapshot` |
| Micromontos ≥ 0,1 USDC | ✅ | `MIN_WORKER_AMOUNT` |
| Freelancer marketplace | ✅ | Mapeo directo roles TW |

### Mapeo roles → plantillas Deals

| Rol WASM | Freelance | Alquiler (ej.) | Auto P2P (ej.) |
|----------|-----------|----------------|----------------|
| `approver` | Cliente (fondea) | Inquilino | Comprador |
| `service_provider` | Freelancer | Propietario (marca entrega) | Vendedor |
| `release_signer` | Cliente | **Propietario** libera depósito | Negociado en UI |
| `receiver` | Freelancer | Propietario / inquilino según trato | Vendedor |
| `dispute_resolver` | ArcusX admin | ArcusX admin | ArcusX admin |

**Edge + BD** deben fijar roles al `initialize` según `template_id` — el contrato no conoce “rental”.

---

## 2. Gaps críticos (requieren plataforma o v2)

| Necesidad | WASM v1 | Solución recomendada | Prioridad |
|-----------|---------|----------------------|-----------|
| **Milestones Deals** (varios pagos, 1 trato) | ❌ un solo ciclo complete/approve/release | **A)** N contratos `C…` (1 por hito) **o** **B)** contrato **v2** `milestone_index` | Alta |
| **Un escrow, N hitos on-chain** | ❌ | v2 o TW multi-milestone en S1 | Alta |
| **Cancel + reembolso sin disputa** | ❌ no hay `cancel` | Off-chain: nuevo tx desde contrato solo vía `resolve` post-disputa, o **v2 `refund_client`** | Alta (Guard) |
| **`releaseOnCallback` automático** | ❌ siempre firma wallet | Edge orquesta XDR tras attestation; contrato sin cambio | Media (agentic) |
| **Partial fund** | ❌ fund único exacto | v2 o múltiples tratos | Baja |
| **> 2 partes** (multi-party) | ❌ 6 roles fijos | v2 o varios contratos | Baja |
| **engagement_id** UUID largo | ⚠️ max 64 chars | Usar hash corto o `agreement_id` numérico en string | Media |
| **Pausa / freeze** | ❌ solo disputa | BD `escrow-admin-freeze` bloquea release en Edge | Media (Guard) |
| **Agente como `dispute_resolver`** | ❌ solo wallet admin | IA off-chain; humano firma `resolve` | Por diseño |
| **Batch 10 pagos 1 tx** | ❌ | v3 o composición off-chain | Fase 4 agentic |

---

## 3. Por producto

### ArcusX Deals ([agreement-deals](../agreement-deals/))

| Feature | Listo con v1 + Edge | Falta |
|---------|---------------------|-------|
| Wizard one-time | ✅ | Deploy + initialize mapping |
| Wizard milestone | ⚠️ | **N escrows** o TW S1 multi-milestone hasta v2 |
| Link `/deal/{token}` | ✅ (plataforma) | Tablas `arcusx_agreements` |
| Release signer en UI | ✅ | `roles.release_signer` en `initialize` |
| Fee 3% UI | ✅ S2 / ~3% S1 TW | Alinear quote |
| Fiat deposit | N/A on-chain | Anchor fase 3 |

### Agentic API ([agentic-payments](../agentic-payments/))

| Feature | Listo | Falta |
|---------|-------|-------|
| 1 subjob = 1 `C…` | ✅ | API + deploy factory |
| `createEscrow(client, worker, amount, condition)` | ✅ vía `initialize` | Edge genera XDR WASM en S2 |
| `releaseOnCallback` | ⚠️ | Edge llama `approve`+`release`; no en WASM |
| Grafos muchos subjobs | ✅ N contratos | Coste deploy; batch v3 |
| x402 complementario | ✅ externo | Sin cambio contrato |

### ArcusX Guard ([arcusx-guard](../agentic-payments/arcusx-guard/))

| Feature | Listo | Falta |
|---------|-------|-------|
| Disputa + resolve split | ✅ | — |
| Red flag → cancel refund | ⚠️ | **refund path** (disputa + resolve a cliente) o v2 |
| Dual agree antes de `resolve` | ✅ (off-chain) | Resolve Agent no firma on-chain |

---

## 4. S1 (Trustless Work) vs S2 (WASM) — estrategia comercial

| Capacidad | S1 TW API | S2 `arcusx-escrow` |
|-----------|-----------|-------------------|
| Lanzar Deals MVP rápido | ✅ multi-milestone TW | Parcial (solo single-release) |
| Fee exacto 1,5%+1,5% | ❌ ~3% cliente | ✅ |
| Agentic scale cost | TW fees | Stellar mínimo + deploy |
| Paridad funciones | milestone index TW | v2 milestone |

**Recomendación:** Deals **milestone** en MVP → **S1 TW** o **N× WASM v1**; migrar a **S2 v2** cuando auditoría liste.

---

## 5. Roadmap contrato (para “infra más grande del mundo”)

### v1.0 (actual) — **Engagement single-release**

- Mantener; auditoría; producción Deals one-time + agentic 1 subjob.

### v1.1 (platform, sin WASM)

- Factory deploy `C…` desde Edge
- `engagement_id` = `deal:{uuid}` / `subjob:{id}`
- Freeze release en Edge si Guard red flag

### v2.0 — **Multi-milestone** (Deals coaching, repair)

```rust
// Diseño borrador
milestones: Vec<MilestoneConfig>  // amount, description_hash
fund_milestone(index)
complete_milestone(index)
approve_milestone(index)
release_milestone(index)
```

O documentar patrón **“milestone = contrato hijo”** sin v2 (más deploys, mismo WASM).

### v2.1 — **Refund / cancel**

- Ver [contracts/arcusx-escrow/V2_REFUND.md](./contracts/arcusx-escrow/V2_REFUND.md) — **IA no firma**; preferir `dispute`+`resolve` o `refund` con `require_auth` estricto

### v3.0 — **Scale agentic**

- `release_batch(Vec<ReleaseItem>)`
- Opcional pool contract (1 deploy por org)

---

## 6. Checklist “listo para comercial global”

### Contrato + Edge

- [ ] S2 E2E testnet con roles Deals (release_signer ≠ approver)
- [ ] Decisión milestone: N×v1 vs v2 vs TW S1
- [ ] Path reembolso Guard documentado (resolve split 100% approver)
- [ ] `engagement_id` convention (`deal-`, `subjob-`, `task-`)
- [~] Wire S2 XDR en Edge (`escrow-backend.ts` + `native-wasm-escrow.ts`; deploy/initialize pendiente; E2E ⬜)

### Productos

- [ ] Deals one-time → WASM v1
- [ ] Deals milestone → patrón elegido
- [ ] Agentic N subjobs → N initialize
- [ ] Guard disputa → resolve

---

## 7. Veredicto

| Pregunta | Respuesta |
|----------|-----------|
| ¿Sirve como base infra global? | **Sí**, con composición **1 C… por unidad de trato** y Edge rico |
| ¿Soporta Deals hoy? | **One-time sí**; **milestone requiere diseño** (N contratos o TW S1) |
| ¿Soporta agentes? | **Sí** (wallets); API es plataforma |
| ¿Soporta Guard? | **Disputa sí**; **refund automático** necesita flujo resolve o v2 |
| ¿Bloqueante #1? | **Multi-milestone on-chain** + **integrar WASM en Edge** (S2) |

---

*Contrato:* [CONTRATO.md](./CONTRATO.md) · *Deals:* [../agreement-deals/](../agreement-deals/) · *Agentic:* [../agentic-payments/](../agentic-payments/)

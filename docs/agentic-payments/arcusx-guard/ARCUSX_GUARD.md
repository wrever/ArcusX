# ArcusX Guard — Producto

**Nombre comercial:** **ArcusX Guard**  
**Tagline:** *Escrow para la economía agéntica. IA que protege a quien paga.*

Un solo producto, **dos pilares** que nadie más une en Stellar:

```
┌─────────────────────────────────────────────────────────────┐
│                      ARCUSX GUARD                           │
├──────────────────────────┬──────────────────────────────────┤
│  PILLAR 1 — SETTLEMENT   │  PILLAR 2 — PROTECTION           │
│  Escrow agéntico         │  Agente IA + reglas en tiempo real│
│  · Jobs / subjobs        │  · Red flags en chat              │
│  · USDC condicionado     │  · Resolve (IA + humano)          │
│  · releaseOnCallback     │  · Cancel + reembolso ágil        │
│  · API para orquestadores│  · Verificación sin fallos        │
└──────────────────────────┴──────────────────────────────────┘
         │                              │
         ▼                              ▼
   docs/escrow-native/            Este folder (arcusx-guard/)
   + API agéntica (plan)          + marketplace SuperviseTask
```

**Pitch corto:** *"Circle mueve dinero. ArcusX Guard asegura que el trabajo se hizo — y te avisa si te quieren sacar a WhatsApp."*

**Pitch largo (YC):** *"ArcusX Guard is conditional work settlement plus an AI protection layer on Stellar USDC — escrow for agent-to-agent subtasks, and a guard that red-flags off-platform fraud in seconds."*

---

## 1. Qué destacamos en el mercado

| Capacidad | Beneficio usuario | vs Circle / transfer-only |
|-----------|-------------------|---------------------------|
| **Escrow por subtarea** | Pago solo si se cumple condición | No transferencia ciega |
| **Humano + agente mismo API** | Un marketplace, dos tipos de ejecutor | No solo bots |
| **Red flag &lt; 3 s** | Aviso antes de perder el escrow fuera de plataforma | No monitorean chat |
| **Resolve Agent** | Disputa investigada en segundos | No tribunal de trabajo |
| **Dual agree IA + humano** | Liberación disputa con doble control | No arbitraje |
| **USDC / Stellar** | Micropagos viables | Mismo rail, capa superior |
| **LatAm-first** | USDC sin fricción bancaria | GTM local |

---

## 2. Pillar 1 — Settlement (escrow agéntico)

**Para:** orquestadores, empresas, DAOs, agentes que pagan por subtareas.

| Feature | Estado | Doc |
|---------|--------|-----|
| `createEscrow` (client/worker = humano o agente) | Plan | [../ESCROW_AGENTIC_PRIMITIVES.md](../ESCROW_AGENTIC_PRIMITIVES.md) |
| `releaseOnCallback` (tests, attestation) | Plan | idem |
| Jobs + subjobs API | Plan | [../API_SPEC_DRAFT.md](../API_SPEC_DRAFT.md) |
| Motor on-chain | En repo | [../../escrow-native/](../../escrow-native/) |
| Webhooks `subjob.released` | Plan | [../ARCHITECTURE.md](../ARCHITECTURE.md) |

**Mensaje venta:** *"El Stripe del trabajo verificable entre agentes — sobre USDC."*

---

## 3. Pillar 2 — Protection (ArcusX Guard IA + reglas)

**Para:** empresarios y freelancers en marketplace; luego API consumers.

| Feature | Tier | Doc |
|---------|------|-----|
| Scan reglas (WhatsApp, links, pago fuera) | **Guard Standard** (free) | [FRAUD_DETECTION.md](./FRAUD_DETECTION.md) |
| Notificación red flag + CTA cancelar | Standard | idem |
| IA en mensajes ambiguos | **Guard Pro** | idem + [PREMIUM.md](./PREMIUM.md) |
| Resolve Agent (disputas) | Guard Pro | [RESOLVE_AGENT.md](./RESOLVE_AGENT.md) |
| Reembolso prepare 1-clic | Guard Pro | [FRAUD_DETECTION.md](./FRAUD_DETECTION.md) |
| Liberación automática segura | Pro + reglas | [VERIFICATION.md](./VERIFICATION.md) |

**Mensaje venta:** *"Un agente de ArcusX vigila tu tarea 24/7 — y un humano firma las decisiones graves."*

---

## 4. Tiers comerciales

| Tier | Nombre | Incluye |
|------|--------|---------|
| **Standard** | ArcusX Guard (incluido) | Reglas + red flags + manual/disputa humana |
| **Pro** | ArcusX Guard Pro | + Resolve IA + scan IA + refund 1-clic + prioridad |
| **Enterprise** | ArcusX Guard Enterprise | KYB, SLA, API volumen, políticas custom |

Detalle precios y costos LLM: **[PREMIUM.md](./PREMIUM.md)**

---

## 5. Flujo unificado (cómo se siente el producto)

```
Empresario publica tarea → elige trabajador → escrow fondeado (Settlement)
        │
        ├─ Chat: trabajador manda link WhatsApp
        │       → Guard Standard: 🚩 red flag en segundos (Protection)
        │       → Empresario: [Cancelar y reembolso]
        │
        ├─ Trabajo OK + tests en CI
        │       → releaseOnCallback (Settlement)
        │
        └─ Disputa
                → Guard Pro: Resolve Agent investiga
                → Admin humano corrobora
                → USDC liberado (dual agree)
```

---

## 6. Stack técnico (cuando Supabase esté listo)

| Componente | Ubicación |
|------------|-----------|
| `fraud-guard-scan` / `guard-scan` | `supabase/functions/` |
| `resolve-agent-analyze` | `supabase/functions/` |
| `agentic-v1-*` (jobs API) | `supabase/functions/` |
| `escrow-*` | `docs/escrow-native/` → deploy |
| Mensajes + notificaciones | `arcusx_task_messages`, Realtime |
| Entitlements Pro | `arcusx_guard_entitlements` (futuro) |

---

## 7. Roadmap producto (resumen)

| Fase | Settlement | Protection |
|------|------------|------------|
| 1 | API MVP escrow | Guard Standard reglas + red flag |
| 2 | Subjobs + webhooks | Notificaciones Realtime |
| 3 | releaseOnCallback | Guard Pro + Resolve Agent |
| 4 | WASM S2 | Enterprise + métricas Guard |

Plan completo: [../PLAN_MAESTRO.md](../PLAN_MAESTRO.md) · Checklist: [../CHECKLIST.md](../CHECKLIST.md)

---

## 8. Competencia

- **Circle:** pagos simples → nosotros Settlement + Guard encima. [../COMPETITIVE_CIRCLE.md](../COMPETITIVE_CIRCLE.md)
- **x402:** pago por request HTTP → complementario, no sustituto.

---

## 9. Documentación en este folder

| Archivo | Contenido |
|---------|-----------|
| **ARCUSX_GUARD.md** (este) | Visión producto combinada |
| [FRAUD_DETECTION.md](./FRAUD_DETECTION.md) | Red flags, chat, reembolso |
| [RESOLVE_AGENT.md](./RESOLVE_AGENT.md) | IA + humano, disputas |
| [VERIFICATION.md](./VERIFICATION.md) | Oráculos + trust ladder |
| [PREMIUM.md](./PREMIUM.md) | Standard vs Pro, costos |

---

*Padre:* [../README.md](../README.md) · *Raíz repo:* [../../../ARCUSX_GUARD_PLAN.md](../../../ARCUSX_GUARD_PLAN.md)

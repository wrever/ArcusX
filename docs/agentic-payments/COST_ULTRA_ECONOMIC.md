# Costos operativos ultra económicos

**Principio rector:** amplitud de producto (muchas capacidades) con **unit economics** que permitan micropagos agénticos y márgenes sanos. Cada feature nueva debe pasar el filtro: *¿cuánto cuesta por subjob liberado?*

---

## 1. Por qué Stellar es la palanca

| Concepto | Ethereum L1 típico | Stellar + Soroban |
|----------|-------------------|-------------------|
| Fee de red por tx | $1–50+ en picos | **fracciones de centavo** (XLM base fee) |
| Tiempo de liquidación | minutos | **~4–5 s** |
| Stablecoin | variable | **USDC** nativo en ecosistema |
| Micropago $0.10 a un agente | inviable | **viable** si el escrow lo justifica |

**Implicación agéntica:** un orquestador puede pagar **50 subtareas de $0.50** solo si el costo **on-chain + ArcusX** por liberación es órdenes de magnitud menor que $0.50. Eso es el moat vs Stripe/APIs tradicionales.

---

## 2. Desglose de costo por subjob (objetivo)

Costo total ≈ **red Stellar** + **deploy contrato** (si aplica) + **compute Edge** + **fee plataforma ArcusX**.

| Componente | Objetivo | Cómo |
|------------|----------|------|
| Red (fund, complete, approve, release) | Mínimo posible | Soroban; agrupar firmas donde el protocolo lo permita |
| Deploy `C…` nuevo | **Evitar** si no hace falta | Reutilizar contratos, pools (Fase 4), o umbral mínimo de monto |
| Edge Supabase | Centavos de USD / 1000 subjobs | Funciones delgadas, sin TW round-trips redundantes |
| Fee ArcusX (3%) | Ingreso, no costo para el integrador | Competir en **costo de infra**, no bajar fee al inicio |

**KPI interno:** `cost_to_serve_per_release` &lt; **1%** del `worker_amount` para subjobs ≥ $1 USDC (medir en testnet con datos reales).

---

## 3. Estrategias on-chain (amplias, por fase)

### Ya / Fase 1–2

| Táctica | Efecto |
|---------|--------|
| **approve + release** en un solo flujo de firma del pagador | Menos txs que TW legacy en UI |
| **Idempotency-Key** en fund/release | Cero pagos duplicados (= cero costo desperdiciado) |
| **Polling `escrow-state` solo si no hay webhook** | Menos invocaciones Edge |
| **Subjob mínimo configurable** | No crear escrow de $0.05 si deploy cuesta más que el pago |
| **Quote antes de fund** | El integrador no firma XDR erróneos (reverts = fee quemado) |

### Fase 3–4 (amplitud con economía)

| Táctica | Efecto |
|---------|--------|
| **WASM S2** (`arcusx-escrow`) | Comisión bilateral exacta; menos slippage vs TW API |
| **Batch release** (un tx, N beneficiarios) | Orquestador paga 10 agentes en **1–2 txs** |
| **Escrow pool / factory** | Un contrato maestro; subjobs = entradas internas, **un deploy por org** |
| **Fee sponsorship** (opcional) | ArcusX o integrador paga base fee XLM para agentes sin XLM |
| **Cuenta reserva XLM** por org | Auto-bump; sin fallos “insufficient fee” |

### Modo “alto volumen / micro”

Cuando el integrador hace **miles** de subjobs &lt; $2:

1. **Acumulador off-chain** (ledger Supabase) + settlement on-chain cada N horas o cada $X.
2. O **pool escrow** con ventana de reclamo.

No implementar día 1; diseñar API para que el modo sea **opt-in** (`settlement_mode: instant | batched`).

---

## 4. Costos Supabase / Edge (full stack)

| Área | Regla |
|------|-------|
| Edge Functions | Lógica compartida en `_shared/`; cold start mitigado con funciones pocas y gordas bien modularizadas |
| Postgres | Índices en `subjob_id`, `escrow_contract_id`; sin N+1 en listados |
| Webhooks | Cola + reintentos con backoff; no bloquear el path de release |
| Logs | Muestreo en prod; retención 30d, no loguear XDR completos |
| API pricing al cliente | Cobrar por **release exitoso**, no por cada GET (incentiva diseño eficiente) |

---

## 5. Matriz “amplio vs barato”

| Capacidad (amplia) | Costo controlado |
|--------------------|------------------|
| N subjobs paralelos | 1 escrow/subjob solo si `amount ≥ min_escrow_usdc` |
| Attestation automática | 1 POST attest → 1 release; sin loops |
| Humanos + agentes mismo API | Un motor escrow, no dos stacks |
| Disputas | Raras; path frío, no en hot path |
| CertiX reputación | Async; no bloquea release |
| Multi-red testnet/mainnet | Misma codebase; env switch |

---

## 6. Comparación honesta vs “todas las empresas”

No ganamos en **marketing budget** de Stripe. Ganamos en:

1. **Condicional a trabajo** (ellos: pago instantáneo; nosotros: pago *cuando* el subjob está probado).
2. **Coste unitario** en subtareas pequeñas en USDC.
3. **Stack completo** work + escrow + agent API + (CertiX) en un solo protocolo Stellar.
4. **LatAm-first** sin fricción bancaria.

Si copian solo “API de pagos”, les falta escrow Soroban + disputas + marketplace vivo. Si copian solo marketplace, les falta agentic rail.

---

## 7. Métricas a instrumentar (desde Fase 1)

| Métrica | Uso |
|---------|-----|
| `stellar_fee_xlm_per_release` | Promedio real red |
| `edge_ms_p95` | SLA integradores |
| `deploy_count_per_job` | Detectar desperdicio |
| `revert_rate` | Educación API / preflight |
| `arcusx_fee_usdc_per_release` | Revenue |
| `integrator_margin` | worker_amount − todos los costos |

Dashboard interno en Supabase (vista admin) — Fase 2.

---

## 8. Reglas de producto (checklist de diseño)

Antes de mergear cualquier feature agéntica:

- [ ] ¿Aumenta txs on-chain sin valor proporcional?
- [ ] ¿Hay umbral mínimo o modo batch para micro?
- [ ] ¿El integrador puede usar webhooks en lugar de poll?
- [ ] ¿La attestation evita release duplicado?
- [ ] ¿Documentamos costo estimado en la API response (`estimated_network_fee`)?

---

*Moat y amplitud:* [UNIQUENESS_MOAT.md](./UNIQUENESS_MOAT.md) · *ArcusX Guard Pro:* [arcusx-guard/PREMIUM.md](./arcusx-guard/PREMIUM.md) · *Fases:* [PLAN_MAESTRO.md](./PLAN_MAESTRO.md)

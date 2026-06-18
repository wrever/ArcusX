# ArcusX — Plan de adaptación: SDK + API pública → infraestructura Stellar

**Plan operativo SDK (v0.1):** [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) — leer primero. Este documento cubre el horizonte largo (fases 0–6).

**Objetivo:** Pasar de *marketplace que consume su propia Edge API* a **Work Execution Layer** — misma API y SDK que usa `arcusx.pro` disponibles para integradores, con settlement USDC en Stellar (Trustless Work hoy → Soroban nativo).

**Relacionado:** [`INSTAAWARDS_SDK_WEEK*.md`](../sprints/instaawards-sdk/) · [`API_REFERENCE.md`](./API_REFERENCE.md) · [`ENDPOINTS.md`](../api/ENDPOINTS.md) · [`escrow-native/GUIA.md`](../escrow-native/GUIA.md)

---

## 1. Estado actual (AS-IS)

```
┌─────────────────────────────────────────────────────────────┐
│  arcusx.pro (React)                                         │
│  arcusxApiUrl('action') + arcusxApiHeaders()                │
│  trustlessWorkEscrowService.ts (wallet TW, solo browser)    │
└──────────────────────────┬──────────────────────────────────┘
                           │ ?action=create_task (monolito)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  arcusx-api (Supabase Edge) — ~55 actions en router.ts      │
│  Auth: Bearer JWT app (sync_supabase_user) o Supabase user  │
│  Sin API keys de partner · Sin webhooks · Sin versionado    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Postgres arcusx_* · RLS · domain events                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ tx_hash / contract_id
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Stellar testnet · Trustless Work escrow · Freighter          │
│  (escrow-native Soroban en docs/, no en prod aún)           │
└─────────────────────────────────────────────────────────────┘
```

### Lo que ya es “infra” (pero privado)

| Primitivo | Dónde vive | Reutilizable |
|-----------|------------|--------------|
| Task lifecycle | `arcusx-api/handlers/tasks.ts`, `escrow.ts` | Sí |
| Deal lifecycle | `handlers/deals.ts` | Sí |
| Escrow metadata + `tx_hash` validation | `escrow.ts`, `released-metrics.ts` | Sí |
| Disputas + ratings | `disputes.ts`, `rating-persist.ts` | Sí |
| Fees 3% | `fees.ts`, `get_platform_fee` | Sí |
| Idempotency | `_shared/idempotency.ts` | Sí — extender a partners |

### Lo que bloquea ser infra pública

| Gap | Impacto |
|-----|---------|
| API = `?action=` sin REST ni versión | Integradores no pueden descubrir contrato estable |
| Auth solo JWT usuario OAuth | B2B no puede operar server-side sin impersonar user |
| Escrow on-chain acoplado al browser TW | SDK server no puede firmar; partner debe traer wallet |
| Mensajería/notificaciones fuera de `arcusx-api` | Flujo incompleto vía API única |
| Sin `tenant_id` / `external_id` | Partners no pueden mapear sus IDs |
| Sin webhooks | No hay push de `funded` / `released` |
| Escrow nativo Soroban no en prod | Dependencia TW + G-address issuers |

---

## 2. Estado objetivo (TO-BE)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ arcusx.pro   │  │ Partner app  │  │ Partner app  │
│ (1er cliente)│  │ (Magnar…)    │  │ (empresas)   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
              ┌─────────────────────┐
              │   @arcusx/sdk       │
              │   + WalletAdapter   │
              └──────────┬──────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌─────────────────┐           ┌─────────────────┐
│ arcusx-api v1   │           │ arcusx-escrow   │
│ (work lifecycle)│           │ (on-chain prep) │
│ partner keys    │           │ quote · XDR     │
└────────┬────────┘           └────────┬────────┘
         │                             │
         └──────────────┬──────────────┘
                        ▼
              ┌─────────────────────┐
              │ Postgres + Stellar    │
              │ TW → Soroban native   │
              └─────────────────────┘
```

**Definición “infra real” (checklist):**

- [ ] Un tercero crea una tarea y cierra escrow **sin fork** del frontend ArcusX
- [ ] Misma API que usa el marketplace (dogfooding)
- [ ] Partner auth + auditoría por `partner_id`
- [ ] Documentación + SDK publicados
- [ ] Volumen on-chain atribuible a integrador (no solo arcusx.pro)
- [ ] Settlement Stellar verificable (explorer)

---

## 3. Capas de producto (qué adaptar)

| Capa | Hoy | Adaptación |
|------|-----|------------|
| **L0 Stellar** | TW testnet | Abstraer `EscrowProvider`: `trustless_work` \| `soroban_native` |
| **L1 Edge API** | `arcusx-api` monolito | + partner auth, tenants, `external_id`, respuestas JSON uniformes |
| **L2 SDK** | Scaffold `packages/arcusx-sdk` | Cliente tipado + módulos + `WalletAdapter` |
| **L3 Integrador** | — | Quickstarts, sandbox keys, empresas embed |
| **L4 Marketplace** | Cliente #1 | Refactor a `@arcusx/sdk` internamente (dogfood) |

---

## 4. Fases de adaptación

### Fase 0 — Alineación (1–2 semanas) · *ya en curso InstaAwards*

**Meta:** Contrato público congelado; cero features nuevas en marketplace.

| Tarea | Archivo / zona |
|-------|----------------|
| Mapa action → SDK method | `docs/sdk/API_REFERENCE.md` |
| Spec partner auth | `docs/sdk/PARTNER_AUTH.md` |
| Scaffold `@arcusx/sdk` | `packages/arcusx-sdk/` |
| Entregables W1–W3 | `docs/sprints/instaawards-sdk/` |

**DoD:** `npm run build` en SDK; docs sin referencias PHP.

---

### Fase 1 — API de partners (2–3 semanas)

**Meta:** Edge acepta integradores B2B sin romper el frontend actual.

#### 1.1 Base de datos

```sql
-- arcusx_partners (tenant)
-- id, name, slug, sandbox, webhook_url, created_at

-- arcusx_partner_keys
-- id, partner_id, key_hash, label, revoked_at, rate_limit_per_min

-- arcusx_partner_audit_log
-- partner_id, action, resource_type, resource_id, ip, created_at
```

#### 1.2 Columnas de enlace en recursos existentes

```sql
ALTER TABLE arcusx_tasks ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES arcusx_partners(id);
ALTER TABLE arcusx_tasks ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE arcusx_agreements ADD COLUMN IF NOT EXISTS partner_id uuid;
ALTER TABLE arcusx_agreements ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX ... ON arcusx_tasks (partner_id, external_id) WHERE external_id IS NOT NULL;
```

#### 1.3 Edge

| Archivo nuevo | Responsabilidad |
|---------------|-----------------|
| `_shared/partner-api-keys.ts` | Validar `x-arcusx-api-key`, attach `partnerId` al ctx |
| `_shared/partner-context.ts` | Scoping: partner solo ve sus `external_id` |
| `router.ts` | Inyectar `partnerId` en ctx antes del handler |

**Rutas partner-first (MVP):**

| Action | Partner key | User JWT |
|--------|-------------|----------|
| `get_landing_market_stats` | opcional | — |
| `get_platform_fee` | opcional | — |
| `create_task` | sí + JWT servicio* | sí |
| `get_tasks` | sí (filtro tenant) | — |
| `get_task_details` | sí | sí |
| `create_deal` | sí | sí |

\* *Fase 1b:* `service_account` por partner (JWT machine-to-machine) para crear tareas sin OAuth del usuario final — requiere `sync_partner_user` o mapping `external_user_id`.

#### 1.4 Respuestas uniformes (infra)

Todo handler devuelve:

```json
{
  "success": true,
  "data": { },
  "meta": { "request_id": "uuid", "api_version": "v1" }
}
```

Migración gradual: wrappers en `jsonSuccess` / `jsonError` en `arcusx-cors.ts`.

**DoD Fase 1:** Partner sandbox crea tarea con key + JWT; aparece en BD con `partner_id`; marketplace sigue igual.

---

### Fase 2 — SDK MVP + dogfooding (2–3 semanas)

**Meta:** `@arcusx/sdk` implementa el contrato; arcusx empieza a consumirlo.

#### 2.1 Paquete SDK

```
packages/arcusx-sdk/src/
  client.ts          # fetch wrapper, api_version, request_id
  auth.ts            # apiKey + bearer
  errors.ts          # ArcusXApiError
  modules/
    tasks.ts
    deals.ts
    escrow.ts
    public.ts
  wallet/
    adapter.ts       # interface only
  stellar/
    trustless.ts     # helpers opcionales (browser)
```

#### 2.2 Refactor frontend (dogfood incremental)

| Servicio actual | Migración |
|-----------------|-----------|
| `createTask` axios → `arcusxApiUrl` | `sdk.tasks.create()` |
| `dealsService.ts` | `sdk.deals.*` |
| `taskEscrowService.ts` (solo BD) | `sdk.escrow.status()` |
| TW signing | Se queda en `trustlessWorkEscrowService` hasta Fase 3 |

**Regla:** Un servicio por PR; no big-bang.

#### 2.3 Ejemplos

- `examples/sdk-node-quickstart` — server partner
- `examples/sdk-react-embed` — mínimo UI + Freighter

**DoD Fase 2:** Smoke `scripts/smoke-sdk.mjs`; al menos 1 flujo marketplace usa SDK internamente.

---

### Fase 3 — Capa escrow unificada (3–5 semanas)

**Meta:** SDK y API exponen **preparación on-chain** sin que el integrador lea Trustless Work docs.

#### 3.1 `EscrowProvider` en Edge

```typescript
// _shared/escrow-provider.ts
type EscrowProvider = 'trustless_work' | 'soroban_native';

interface EscrowPrepareResult {
  provider: EscrowProvider;
  contract_id?: string;
  unsigned_xdr?: string;
  fee_quote: FeeQuote;
  steps: ('sign_deploy' | 'sign_fund' | 'sign_release')[];
}
```

| Provider | Estado | Acciones Edge |
|----------|--------|---------------|
| `trustless_work` | Prod hoy | Metadata en `create_escrow`; firma en cliente TW |
| `soroban_native` | `docs/escrow-native/` | `escrow-create-and-fund-prepare`, `confirm` (cuando checklist verde) |

#### 3.2 Nuevas actions (o ampliar existentes)

| Action | Qué hace |
|--------|----------|
| `escrow_quote` | Worker amount → client total + platform fee |
| `escrow_prepare_fund` | Devuelve XDR / steps según provider |
| `escrow_confirm_fund` | `tx_hash` → actualiza BD |
| `escrow_prepare_release` | XDR approve+release |
| `escrow_confirm_release` | `tx_hash` → `complete_task` / `mark_deal_released` |

Hoy parte vive en escrow-native bundle **separado** — adaptación = **montar bajo `arcusx-api`** o proxy `arcusx-escrow` con mismo auth partner.

#### 3.3 SDK stellar module

```typescript
const prep = await ax.escrow.prepareFund({ taskId, clientWallet, workerWallet });
await wallet.signTransaction(prep.unsigned_xdr);
await ax.escrow.confirmFund({ taskId, txHash });
```

**DoD Fase 3:** Integrador completa fund+release con SDK + adapter; provider configurable por env.

---

### Fase 4 — API v1 REST (opcional, 2–4 semanas)

**Meta:** URLs estables además de `?action=` (compat legacy).

```
POST   /v1/tasks
GET    /v1/tasks/:id
POST   /v1/tasks/:id/escrow/prepare-fund
POST   /v1/tasks/:id/escrow/confirm-fund
POST   /v1/deals
...
```

Implementación: nuevo Edge `arcusx-api-v1` o rewrite en `router.ts` con path dispatch — **misma lógica de handlers**, distinto entrypoint.

**DoD:** OpenAPI spec generada; SDK usa `/v1/` por defecto con fallback `?action=`.

---

### Fase 5 — Webhooks + observabilidad (2 semanas)

| Evento | Payload mínimo |
|--------|----------------|
| `task.created` | `task_id`, `external_id`, `partner_id` |
| `escrow.funded` | `contract_id`, `tx_hash` |
| `task.completed` | `tx_hash`, `volume_usdc` |
| `deal.released` | idem deals |

Tabla `arcusx_webhook_deliveries` + retry exponencial.

**DoD:** Partner recibe POST en sandbox; dashboard admin muestra entregas.

---

### Fase 6 — Mainnet + Soroban default (gate separado)

- Checklist `docs/escrow-native/CHECKLIST.md` en verde
- `EscrowProvider` default = `soroban_native` en prod
- TW = compat layer testnet/legacy

---

## 5. Matriz: sistema actual → cambio concreto

| Componente actual | Cambio | Prioridad |
|-------------------|--------|-----------|
| `arcusx-api/handlers/router.ts` | + partner ctx, request_id | P0 |
| `_shared/arcusx-auth.ts` | + API key path antes de JWT | P0 |
| `arcusx/src/services/*.ts` | Consumir `@arcusx/sdk` | P1 |
| `trustlessWorkEscrowService.ts` | Detrás de `WalletAdapter` + `sdk.escrow.prepare*` | P2 |
| `docs/escrow-native/supabase/functions/*` | Merge o proxy bajo arcusx-api auth | P2 |
| `ENDPOINTS.md` | Split: Public API v1 / Internal / Admin | P0 |
| Mensajería RPC Supabase | Fase posterior: `v1/threads` o documentar como out-of-band | P3 |

---

## 6. Modelo de auth (dos modos)

### Modo A — Embed con usuarios OAuth (como hoy)

1. Partner redirige a OAuth ArcusX o usa Supabase Auth propio + `sync_supabase_user`
2. JWT usuario en SDK: `bearerToken`
3. Partner key identifica tenant y límites

### Modo B — Server-only (B2B)

1. Solo `x-arcusx-api-key`
2. Body incluye `external_user_id`, `external_id` por recurso
3. Edge crea/resuelve shadow user o service mapping *(Fase 1b)*

**Recomendación:** lanzar Modo A en InstaAwards SDK; Modo B para empresas Q3.

---

## 7. Stellar: hoja de ruta técnica

| Etapa | On-chain | SDK expone |
|-------|----------|------------|
| **Ahora** | TW, G-issuers, browser | `tx_hash` post-signing |
| **S1** | TW + quote unificado Edge | `prepareFund` / `confirmFund` |
| **S2** | Soroban `C…` WASM propio | Misma interface `EscrowProvider` |
| **Mainnet** | USDC issuer mainnet + passphrases | `network: 'testnet' \| 'mainnet'` en config |

**No duplicar lógica:** `fee_quote` solo en `_shared/fees.ts`; SDK nunca calcula comisión.

---

## 8. Cronograma sugerido (equipo lean)

```
Mes 1   Fase 0 + Fase 1 (partner keys, tenant columns, audit)
Mes 2   Fase 2 (SDK completo + dogfood 2 servicios + quickstart)
Mes 3   Fase 3 inicio (escrow prepare/confirm en API)
Mes 4   Fase 3 cierre + piloto B2B #1 (empresas / prospecto Chile)
Mes 5   Fase 4 REST v1 + OpenAPI (si hay demanda)
Mes 6   Fase 5 webhooks + mainnet gate
```

Paralelo: marketplace y métricas OAuth no se detienen.

---

## 9. Métricas “somos infra”

| Métrica | Hoy | Objetivo 6 meses |
|---------|-----|------------------|
| Partners con key activa | 0 | 3+ |
| GMV vía `partner_id != null` | $0 | >$1K USDC |
| % calls desde `@arcusx/sdk` (internal+external) | 0% | >50% internal |
| Handlers con `partner_id` scoping | 0 | create_task, create_deal, get_* |
| Escrow provider abstraction | No | Sí |
| Docs públicas | Borrador | quickstart + API ref |

---

## 10. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Romper frontend al extraer SDK | Dogfood servicio por servicio; smoke E2E |
| Partner sin wallet | Documentar Freighter; Modo A OAuth |
| Dos APIs escrow (arcusx-api vs escrow-native) | Unificar bajo `EscrowProvider` + mismo auth |
| Scope creep REST v1 | Mantener `?action=` indefinidamente; REST es alias |
| Regulación | Non-custodial: ArcusX no firma por el usuario |

---

## 11. Próximas acciones (esta semana)

1. [ ] Migración SQL `arcusx_partners` + `arcusx_partner_keys` (borrador en `supabase/migrations/`)
2. [ ] `_shared/partner-api-keys.ts` + tests manuales con curl
3. [ ] Implementar `packages/arcusx-sdk/src/modules/tasks.ts` (primer módulo)
4. [ ] Ampliar `API_REFERENCE.md` con columnas Partner / User JWT / Response shape
5. [ ] Decidir Fase 1b: ¿shadow users o solo Modo A en primer piloto?

---

## 12. Narrativa única (investor + InstaAwards)

> ArcusX is the work-execution layer on Stellar. The marketplace at arcusx.pro is our first production client. The same Edge API and TypeScript SDK we use internally are the product: post work, lock USDC in non-custodial escrow, verify delivery, settle on-chain. Partners embed it; we do not custody funds.

---

*Documento vivo — actualizar al cerrar cada fase en `CHANGELOG.md`.*

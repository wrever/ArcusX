# InstaAwards — ArcusX SDK (plan de ejecución)

**Plan maestro (fuente de verdad):** [`docs/sdk/PLAN_MAESTRO.md`](../../sdk/PLAN_MAESTRO.md)

**Objetivo del track:** Exponer la capa de ejecución de trabajo (Edge API + escrow) como **SDK TypeScript** empaquetado para integradores B2B — alineado con la narrativa *Work Execution Layer on Stellar*.

**Entregables públicos (uno por semana):**

| Semana | Archivo a compartir con revisor | Rama / merge |
|--------|--------------------------------|--------------|
| 1 | [`INSTAAWARDS_SDK_WEEK1.md`](./INSTAAWARDS_SDK_WEEK1.md) | `sdk/week-1-spec` → `main` |
| 2 | [`INSTAAWARDS_SDK_WEEK2.md`](./INSTAAWARDS_SDK_WEEK2.md) | `sdk/week-2-mvp` → `main` |
| 3 | [`INSTAAWARDS_SDK_WEEK3.md`](./INSTAAWARDS_SDK_WEEK3.md) | `sdk/week-3-docs` → `main` |

**Regla:** El revisor tiene acceso a GitHub. Cada semana solo debe existir en `main` lo declarado en el entregable de esa semana. Trabajo adelantado vive en rama privada hasta la fecha de merge acordada con el calendario InstaAwards.

---

## Alcance MVP (lo que SÍ entra en 3 semanas)

- Paquete npm `@arcusx/sdk` (TypeScript, ESM + CJS)
- Cliente HTTP sobre `arcusx-api` existente (sin reescribir Edge)
- Tipos: `Task`, `Deal`, `EscrowStatus`, `ApiError`, `WorkEntry`, paginación
- Flujos marketplace: `create`, `apply`, `selectProposal`, `getEscrowStatus`, `completeTask` (con `tx_hash`)
- Flujos **private**: `finalize`, `accept`, `reject`, `list`
- Flujos deals: `createDeal`, `getDealDetails`, `acceptDeal`, `markDealReleased`
- Auth integrador: API key header (`x-arcusx-api-key`) + documentación; JWT usuario para flujos end-user
- `WalletAdapter` interface (implementación Freighter = ejemplo, no obligatoria en core)
- Quickstart + `examples/sdk-node-{marketplace,private,deal}`
- Script smoke: `scripts/smoke-sdk.mjs`

**Fuera de alcance (InstaAwards SDK track):**

- Soroban native escrow en el SDK (track aparte `docs/escrow-native/`)
- Webhooks
- Python SDK
- Economía agéntica / IA

---

## Estructura en repo (destino final)

```
packages/arcusx-sdk/
  package.json
  tsconfig.json
  src/
    index.ts
    client.ts
    types.ts
    errors.ts
    auth.ts
    modules/
      public.ts
      marketplace.ts
      private.ts
      deals.ts
      escrow.ts
      settlement.ts
    wallet/
      adapter.ts
  README.md
docs/sdk/
  CHECKLIST.md          # lista de trabajo ejecutable
  FEE_MODEL.md
  QUICKSTART.md
  openapi-v1.yaml
  API_REFERENCE.md
  PARTNER_AUTH.md
examples/
  sdk-node-marketplace/
  sdk-node-private/
  sdk-node-deal/
supabase/functions/
  arcusx-api/handlers/partner-auth.ts   # semana 2
  _shared/partner-api-keys.ts
```

---

## Calendario de implementación

### Semana 1 — Especificación y cimientos

| Día | Tarea | Artefacto |
|-----|-------|-----------|
| 1–2 | Auditar `docs/api/ENDPOINTS.md` → superficie SDK v1 | `docs/sdk/API_REFERENCE.md` (borrador) |
| 2–3 | Diseño auth partners + límites | `docs/sdk/PARTNER_AUTH.md` |
| 3–4 | Scaffold `packages/arcusx-sdk` (build vacío, exports) | PR `sdk/week-1-spec` |
| 4–5 | Tipos base + `ArcusXClient` stub | `types.ts`, `client.ts` skeleton |

**Definition of done W1:** paquete compila; docs de spec + auth; sin métodos de negocio aún.

### Semana 2 — MVP funcional

| Día | Tarea | Artefacto |
|-----|-------|-----------|
| 1–2 | `client.ts` + `errors.ts` + retry/timeouts | tests manuales smoke |
| 2–3 | `modules/marketplace.ts` + `private.ts` + `escrow.ts` | 16 métodos core |
| 3–4 | `modules/deals.ts` + `settlement.ts` | 8 métodos deals + settlement |
| 4–5 | Edge: validación API key en rutas partner (opt-in) | migración `arcusx_partner_keys` |

**Definition of done W2:** los tres `examples/sdk-node-*` crean recurso en testnet con API key; README mínimo.

### Semana 3 — Documentación y cierre revisor

| Día | Tarea | Artefacto |
|-----|-------|-----------|
| 1–2 | `QUICKSTART.md` + README del paquete | copy alineado 3% fee, testnet |
| 2–3 | Ejemplo Freighter opcional en `examples/` | wallet adapter demo |
| 3–4 | `scripts/smoke-sdk.mjs` en CI opcional | salida JSON para revisor |
| 4–5 | Changelog + link en README raíz | `CHANGELOG.md` entrada SDK |

**Definition of done W3:** revisor puede clonar, `npm install`, correr quickstart contra testnet con key de sandbox.

---

## Estrategia Git (visible para el revisor)

1. **Rama de trabajo:** `feat/arcusx-sdk` (integración continua interna).
2. **Cada semana:** cherry-pick o sub-PR a `sdk/week-N-*` → merge a `main` en la fecha del programa.
3. **Commits:** mensajes explícitos (`sdk(week1): add partner auth spec`) — historial = evidencia de progreso real.
4. **No** subir `packages/arcusx-sdk` completo en W1 si el entregable W1 solo promete spec + scaffold.

---

## Dependencias previas

- [ ] `docs/api/ENDPOINTS.md` actualizado (Edge, no PHP)
- [ ] Proyecto Supabase testnet estable
- [ ] Al menos 1 API key de sandbox generada para demo revisor
- [ ] Variable documentada: `ARCUSX_SDK_BASE_URL`, `ARCUSX_API_KEY`

---

## Narrativa InstaAwards (3 bullets por semana)

**W1:** Definimos el contrato público del SDK y auth de partners — misma API que usa el marketplace.

**W2:** SDK TypeScript ejecutable; primer integrador puede crear tareas sin fork del frontend.

**W3:** Quickstart, smoke test y paquete listo para pilotos B2B (Magnar, empresas, etc.).

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Escrow on-chain sigue en cliente (TW) | SDK documenta `WalletAdapter`; Edge persiste estado |
| API key sin tabla en BD | Migración semana 2, no bloquear scaffold |
| Revisor prueba sin key | Documentar key sandbox + `get_landing_market_stats` sin auth |

---

*Plan interno — alinear fechas de merge con calendario InstaAwards antes de compartir cada `INSTAAWARDS_SDK_WEEKn.md`.*

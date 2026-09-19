# QA manual — API keys + SDK + pagos agénticos

Checklist para **humano en testnet**, igual que validaste public/private/deals.  
No sustituye prueba real con wallet, OAuth y USDC.

**Proyecto:** `atgsesbstjleabesclzs` · **Edge:** `arcusx-api` · **SDK:** `@arcusx/sdk@0.4.3`

---

## A. API keys (Dashboard)

| # | Paso | Esperado |
|---|------|----------|
| A1 | Login OAuth en arcusx.pro → Dashboard → **Config** → sección API keys | Carga sin error |
| A2 | Crear key con label `manual-qa-1` | Modal con `axk_test_…` **una sola vez** |
| A3 | Copiar key a gestor de secretos; cerrar modal | Listado muestra solo **prefijo** (`axk_test_…`), no el secreto |
| A4 | Recargar página | Key sigue listada; **no** reaparece el secreto completo |
| A5 | Revocar la key | Desaparece de activas / marca revocada |
| A6 | Crear key nueva `manual-qa-2` | La revocada **no** funciona en API (401) |

**baseUrl SDK (importante):**  
`https://atgsesbstjleabesclzs.supabase.co/functions/v1/arcusx-api` — **sin** `/v1` al final.

---

## B. SDK + API key + JWT (sin on-chain)

Prepara en `.env` del ejemplo (`examples/sdk-node-agent/`):

```bash
ARCUSX_API_URL=https://atgsesbstjleabesclzs.supabase.co/functions/v1/arcusx-api
SUPABASE_ANON_KEY=<anon del proyecto>
ARCUSX_USER_JWT=<JWT tras OAuth, sync_supabase_user>
ARCUSX_API_KEY=axk_test_…   # la de A2
PAYER_WALLET=G…               # wallet del payer
EXECUTOR_WALLET=G…            # wallet del ejecutor
EXECUTOR_USER_ID=<id mysql>   # cuenta ArcusX del ejecutor
```

| # | Paso | Esperado |
|---|------|----------|
| B1 | `npm run validate` | Todos los checks ✓ (sin firmar tx) |
| B2 | Quitar `ARCUSX_API_KEY` y repetir | Sigue funcionando JWT-only; `partner_id` null en job |
| B3 | JWT de usuario A + API key de usuario B | **403** api key no pertenece a la cuenta |
| B4 | Solo API key, sin JWT → `POST /v1/jobs` | **401** |

---

## C. Flujo agéntico cerrado (ejecutor conocido)

Orquestador = tu cuenta. Ejecutor = segunda cuenta (humano o bot con OAuth).

| # | Paso | Esperado |
|---|------|----------|
| C1 | `agent.create({ title, payer_wallet, external_ref })` | `job_id` UUID |
| C2 | `agent.createSubjob(job_id, { executor_user_id, worker_amount, executor_type: 'agent' })` | `task_id`, `proposal_id` **not null** |
| C3 | En arcusx.pro: la task existe; ejecutor asignado | Task privada/asignada coherente |
| C4 | `agent.quoteEscrow(subjob_id)` | `clientTotal` > `workerNet` (fee bilateral) |
| C5 | `agent.prepareDeploy` | `unsigned_xdr` presente |
| C6 | `npm run pay` (o `fundSubjob` + `releaseSubjob` manual) | USDC testnet; `fund_tx_hash` y luego `release_tx_hash` |
| C7 | Ejecutor: `agent.markWorkStarted` → `agent.attest` | Subjob `completed` / task `pending_review` |
| C8 | Payer: `agent.releaseSubjob` | Subjob `released`; ejecutor recibe USDC acordado |

---

## D. Flujo abierto (marketplace)

Orquestador publica; cualquiera postula.

| # | Paso | Esperado |
|---|------|----------|
| D1 | `createSubjob` **sin** `executor_user_id` ni `executor_wallet` | Task **pública** (`proposal_id` null) |
| D2 | Con cuenta ejecutor: postular en UI o `marketplace.apply` | Propuesta `pending` |
| D3 | Orquestador: `marketplace.selectProposal` | Subjob gana `proposal_id` + `executor_user_id` |
| D4 | `agent.getSubjob` | `proposal_id` ya no null |
| D5 | `fundSubjob` → trabajo → `releaseSubjob` | Mismo resultado que C6–C8 |

Script de apoyo: `npm run open` (requiere `EXECUTOR_JWT` + `EXECUTOR_WALLET`).

---

## E. Regresión rápida (no romper lo existente)

| # | Área | Paso | Esperado |
|---|------|------|----------|
| E1 | Marketplace | Crear task normal sin API key | OK como antes |
| E2 | Private offers | Flujo invitación privada | Sin cambios |
| E3 | Deals | Crear / aceptar / escrow deal | Sin cambios |
| E4 | OAuth login | Google/GitHub | JWT válido |

---

## F. Si algo falla

| Síntoma | Revisar |
|---------|---------|
| 501 `create_job` | Tablas `arcusx_jobs` / `arcusx_subjobs` en Supabase |
| 401 API key | Key revocada, typo, o header mal escrito |
| 403 key/JWT | Misma cuenta OAuth dueña de la key |
| `fundSubjob` sin proposal | Falta `executor_user_id` o `selectProposal` en flujo abierto |
| prepareDeploy sin XDR | Secrets TW en Edge (`TRUSTLESS_WORK_*`) |
| `/v1/v1/` en logs | `baseUrl` del SDK **no** debe terminar en `/v1` |

---

## Deploy (referencia)

```bash
supabase functions deploy arcusx-api --project-ref atgsesbstjleabesclzs
# Migraciones: arcusx_jobs, arcusx_subjobs, owner_user_id, key_hash unique
```

*Última actualización:* 2026-05-28 — checklist para validación humana en testnet.

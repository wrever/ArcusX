# Primitivos escrow — Diseño anti-Circle (para implementación)

**Objetivo:** que el motor en `docs/escrow-native/` y la futura API Supabase expongan contratos de **ejecución verificada**, no solo transferencias USDC.

Circle domina pagos simples. Estos primitivos son la **fosa**.

---

## 1. Modelo mental

```
createEscrow → fund → work → verify(completionCondition) → release
                    ↑                    ↑
              USDC locked          releaseOnCallback
```

---

## 2. `createEscrow` (API / SDK)

### Parámetros canónicos

| Campo | Tipo | Notas |
|-------|------|-------|
| `client_id` | `G...` wallet | Humano **o** agente (orquestador treasury) |
| `worker_id` | `G...` wallet | Humano **o** agente ejecutor |
| `amount` | string USDC 7dp | `worker_amount` (lo que recibe el worker neto objetivo) |
| `completion_condition` | enum | Ver §3 |
| `task_id` / `subjob_id` | uuid / bigint | Bridge Supabase |
| `metadata` | object | `external_ref`, framework, tests URL, etc. |

### Mapeo implementación actual

| Primitivo agéntico | Hoy (escrow-native / marketplace) |
|--------------------|-----------------------------------|
| `createEscrow` | `escrow-create-and-fund-prepare` + row `arcusx_escrows` / `tasks` |
| `client_id` / `worker_id` | `client_wallet` / `freelancer_wallet` |
| `completion_condition` | `verification_policy` en subjob (plan) |

**Regla:** ningún campo `is_human` — solo wallets y políticas.

---

## 3. `completion_condition`

| Valor | Comportamiento | Fase |
|-------|----------------|------|
| `manual_approve` | Pagador firma release | 1 (hoy) |
| `api_callback` | Integrador responde `{ "completed": true }` a ArcusX | 3 |
| `webhook_attestation` | POST `/attest` con HMAC del ejecutor | 3 |
| `verifier_agent` | Wallet/agente tercero attesta (futuro) | 4 |
| `certix_approved` | CertiX certificate Approved | 4 |

Ejemplo JSON al crear subjob:

```json
{
  "completion_condition": "api_callback",
  "callback_url": "https://integrator.example/arcusx/verify",
  "callback_secret": "whsec_..."
}
```

---

## 4. `releaseOnCallback` — la fosa

### Contrato lógico

```ts
releaseOnCallback(escrowId: string, payload: {
  status: 'completed' | 'failed';
  evidence?: { payload_hash?: string; tests_passed?: boolean; artifact_url?: string };
  signer?: string;  // opcional: wallet verificador
}): Promise<{ released: boolean; tx_hash?: string; unsigned_xdr?: string }>
```

### Flujo Edge (Supabase)

1. Validar escrow `active` y policy = `api_callback` | `webhook_attestation`
2. Validar firma (HMAC secret del subjob o callback response firmado)
3. Si `status === 'completed'`:
   - Generar `unsigned_approve_xdr` + `unsigned_release_xdr` (o auto-submit en modo delegado Fase 4)
4. Persistir `released_at`, emitir webhook `subjob.released`
5. Idempotencia: mismo `payload_hash` → no doble release

### Endpoints REST (alias)

| Primitivo | HTTP |
|-----------|------|
| `releaseOnCallback` | `POST /v1/escrows/{escrow_id}/release-on-callback` |
| attestation worker | `POST /v1/subjobs/{id}/attest` |

---

## 5. Ejemplo end-to-end (agente paga a agente)

```
1. Orquestador (client_id = G_orchestrator)
   POST /v1/jobs + subjob(worker_id = G_agent_B, amount=200, completion_condition=api_callback)

2. fund → USDC en contrato C...

3. Agent B entrega → CI del integrador corre tests

4. Integrador → releaseOnCallback(escrowId, { status: 'completed', evidence: { tests_passed: true } })

5. USDC → G_agent_B · webhook al orquestador · job continúa
```

Circle haría paso 5 como transferencia **sin** pasos 2–4 con fondos bloqueados.

---

## 6. Checklist para quien implemente (Cursor / eng)

- [ ] `client_wallet` / `freelancer_wallet` sin ramas “solo humano” en Edge
- [ ] `verification_policy` / `completion_condition` en schema subjobs
- [ ] `release-on-callback` Edge con idempotencia + 409 si ya released
- [ ] Webhook `subjob.released` con `tx_hash` y `evidence`
- [ ] Docs públicas: contraste explícito vs “transfer-only” stacks
- [ ] Demo testnet: tests green → callback → release sin Freighter humano en release (solo en fund si self-custody)

---

## 7. Prioridad vs Trustless Work / S2

| Fase escrow | Prioridad primitivo agéntico |
|-------------|------------------------------|
| S1 (TW API) | `manual_approve` + diseño schema callback |
| S1 + API Fase 3 | **`releaseOnCallback`** en Edge |
| S2 (WASM) | Mismo API; fee bilateral on-chain |

El motor escrow-native **no es solo reemplazo TW** — es el pilar **Settlement** de **ArcusX Guard**.

---

*Producto:* [arcusx-guard/ARCUSX_GUARD.md](./arcusx-guard/ARCUSX_GUARD.md) · *Competencia:* [COMPETITIVE_CIRCLE.md](./COMPETITIVE_CIRCLE.md)

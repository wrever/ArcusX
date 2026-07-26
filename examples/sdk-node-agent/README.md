# SDK Node — agentic payments

Ejemplos con `@arcusx/sdk` contra Edge `arcusx-api`.

**Validación:** usa la checklist humana en [`docs/agentic-payments/MANUAL_QA.md`](../../docs/agentic-payments/MANUAL_QA.md).  
Los scripts aquí son ayudas; la prueba real es con tu OAuth, API key y wallet testnet.

## Setup

```bash
npm install
cp .env.example .env   # si existe; si no, exporta variables abajo
```

Variables mínimas:

```bash
export ARCUSX_API_URL=https://atgsesbstjleabesclzs.supabase.co/functions/v1/arcusx-api
export SUPABASE_ANON_KEY=...
export ARCUSX_USER_JWT=...      # localStorage token tras login
export ARCUSX_API_KEY=axk_test_...  # Dashboard → Config
export EXECUTOR_WALLET=G...
export EXECUTOR_USER_ID=...
export PAYER_WALLET=G...
# Pago on-chain:
export PAYER_SECRET_KEY=S...
```

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm start` | Job + subjob (sin firmar) |
| `npm run validate` | Checks API sin blockchain |
| `npm run open` | Tarea abierta → apply → select |
| `npm run pay` | Deploy + fund + release testnet |
| `npm run callback` | Attestation HMAC + release-on-callback |

## baseUrl

Debe ser `…/functions/v1/arcusx-api` **sin** `/v1` final. El SDK añade `/v1` solo.

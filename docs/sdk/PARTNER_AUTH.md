# ArcusX SDK — Partner authentication

**SOW 2 Semana 1** · Quickstart: [`QUICKSTART.md`](./QUICKSTART.md) · API: [`API_REFERENCE.md`](./API_REFERENCE.md)

## Modes

| Mode | Cómo autentica el SDK | When |
|------|----------------------|------|
| **Partner (server)** | `Authorization: Bearer axk_test_…` / `axk_live_…` | Backend B2B (default) |
| **Partner + end user** | `Authorization: Bearer <app_jwt>` + `x-arcusx-api-key: axk_…` | Acciones del usuario tras OAuth |
| **Gateway alt** | Header `x-arcusx-api-key` (aceptado por `api.arcusx.pro`) | Compat |

Partners **no** necesitan `SUPABASE_ANON_KEY` contra `https://api.arcusx.pro`.

## Key format

- Sandbox: `axk_test_…`
- Production: `axk_live_…`
- Solo se almacena `key_hash` (SHA-256) en `arcusx_partner_keys`
- Nunca commitear keys

## Crear keys

- Dashboard ArcusX → Developer / API keys (JWT usuario), o
- Equipo ArcusX entrega `axk_test_…` out-of-band para revisores Instawards

Migraciones: `supabase/migrations/20260528140000_arcusx_partners.sql`, `20260630120000_user_api_keys.sql`, …

## Gateway

| Item | Valor |
|------|-------|
| Base URL default SDK | `https://api.arcusx.pro` |
| Edge function | `arcusx-partner-api` → proxy a `arcusx-api/v1/…` |

Sin key:

```json
{
  "success": false,
  "error": {
    "code": "missing_api_key",
    "message": "Incluye Authorization: Bearer axk_test_… o axk_live_…"
  }
}
```

Key inválida / revocada:

```json
{
  "success": false,
  "error": { "code": "invalid_api_key", "message": "…" },
  "meta": { "request_id": "…", "api_version": "v1" }
}
```

HTTP status: **401** (o **429** `rate_limit_exceeded`).

## User OAuth (flujos user-scoped)

1. Usuario inicia sesión (Supabase OAuth) en la app del partner / ArcusX
2. `sync_supabase_user` → JWT de app
3. SDK:

```typescript
new ArcusXClient({
  apiKey: 'axk_test_…',
  bearerToken: appJwt,
  network: 'testnet',
});
```

**Público sin JWT:** `getMarketStats`, `getPlatformFee`, `getTasks`, `getByToken` (preview).

## Rate limits

| Tier | Limit |
|------|-------|
| Sandbox | ~60 req/min |
| Production | ~600 req/min |

Implementación actual: in-memory por key en Edge (`partner-api-keys.ts`).

## Threat model (SOW 3 agentic)

| Riesgo | Mitigación |
|--------|------------|
| Partner key = actúa como `owner_user_id` del partner | Tratar `axk_*` como secreto de servidor; no embeber en apps públicas |
| Gateway puede enviar solo `x-arcusx-api-key` (sin JWT) | `requireUser` usa `ctx.partnerId` resuelto por hash; no cae a JWT inválido |
| Colisión de `Idempotency-Key` entre partners | Keys se scopian `p:{partnerId}:…` / `u:{userId}:…` en Edge |
| Subjobs agenticos en board público | Tasks de `create_subjob` se crean con `is_private_invite=true` |
| Acciones agenticas en mainnet | Forzadas a **testnet** en `resolveStellarNetwork` |
| PAT / keys pegadas en chat | Rotar en Dashboard; nunca commit |

Agentic network: siempre Testnet mientras Instawards SOW 3 esté activo.

## Acceptance (Semana 1)

- [x] Partner keys + gateway en producción (`https://api.arcusx.pro`)
- [x] SDK envía Bearer `axk_…` por defecto
- [x] Envelope JSON de éxito/error tipado en `/v1/`
- [x] Smoke: key **válida** → lecturas públicas vía gateway
- [x] Smoke: key ausente → `missing_api_key`; inválida → `invalid_api_key`
- [x] Demo walkthrough: `scripts/demo-week1-sdk.mjs`
- [ ] Reviewer sandbox key rotada al cierre del programa

# Seguridad y cumplimiento — API agéntica

## 1. API keys

| Regla | Detalle |
|-------|---------|
| Formato | `arcusx_live_` / `arcusx_test_` + 32+ bytes aleatorios |
| Almacenamiento | Solo hash (bcrypt/argon2) en DB; mostrar secret una vez al crear |
| Rotación | Revocar + crear nueva sin downtime (grace 24h opcional) |
| Scopes | Mínimo privilegio: key de ejecutor no puede `release` sin scope |
| Entorno | Keys testnet separadas de mainnet |

---

## 2. Rate limiting

| Tier | Requests/min | Volumen USDC/día |
|------|--------------|------------------|
| Sandbox | 60 | 100 |
| Starter | 300 | 10,000 |
| Growth | 1,000 | negociado |

Respuesta **429** con `Retry-After`.

---

## 3. Wallets y custodia

| Fase | Modelo |
|------|--------|
| 1–2 | Self-custody: ArcusX nunca guarda seed |
| 3 | Optional **delegated signing**: límites por monto/día/org |
| 4 | Custodial enterprise: KYB + contrato + segregación de fondos |

**Hot wallets de agentes:** documentar riesgo; recomendar sub-wallets por job.

---

## 4. Webhooks

- HTTPS obligatorio (excepto localhost en dev)
- HMAC-SHA256 del body con secret por endpoint
- Timestamp `X-ArcusX-Timestamp` + rechazo si &gt; 5 min skew (replay)
- Idempotencia de eventos: `evt_id` único

---

## 5. Fraude y abuso

| Vector | Mitigación |
|--------|------------|
| Spam de jobs micropago | Mínimo monto + fee mínimo API |
| Attestation falsa | Secret por subjob + IP allowlist opcional |
| Lavado vía API | Límites KYB; monitoreo volumen |
| Robo de API key | Scopes + alertas uso anómalo |

---

## 6. Cumplimiento (roadmap)

| Tema | Fase |
|------|------|
| ToS + API AUP | Antes beta pública |
| KYB organizaciones API | Fase 4 enterprise |
| KYC ejecutores humanos | Marketplace existente |
| Reportes regulador | Según jurisdicción — asesoría legal externa |
| Travel rule / USDC | Evaluar con emisor y counsel |

**Nota:** ArcusX no es banco; es infraestructura de escrow. El integrador puede ser MSB según su modelo — clarificar en docs.

---

## 7. Auditoría

- Log inmutable de: fund, complete, attest, release (quién, cuándo, tx hash)
- Export CSV por `organization_id` para contabilidad
- Admin: congelar org (`escrow-admin-freeze` pattern)

---

## 8. Secretos

| Secret | Dónde |
|--------|-------|
| `TRUSTLESS_WORK_API_KEY` | Solo Edge |
| API key hashes | Supabase |
| Webhook secrets | Supabase, cifrado at rest |
| JWT app humano | PHP / Supabase Auth (separado de API keys) |

Nunca `VITE_*` para secrets agénticos.

---

*Checklist gates:* [CHECKLIST.md](./CHECKLIST.md)

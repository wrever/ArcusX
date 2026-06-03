# Backend Supabase — Sign-off 100%

**Fecha:** 2026-05-28  
**Proyecto:** `atgsesbstjleabesclzs`

## Checklist técnico

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Paridad marketplace PHP → Edge | ✅ `PARITY_MATRIX.md` |
| 2 | `arcusx-api` + `arcusx-admin` + satélites | ✅ deploy v29+ |
| 3 | Realtime notif + mensajes | ✅ |
| 4 | Email Resend + outbox worker | ✅ |
| 5 | Escrow reconcile + idempotencia | ✅ |
| 6 | `domain_events` flujo crítico | ✅ |
| 7 | Evidencias milestone + Storage | ✅ |
| 8 | **KYC/KYB backend** (submit, admin approve/reject, listados) | ✅ migración `20260602120000` |
| 9 | **Webhook ingress** (`arcusx-webhook-ingress`) | ✅ |
| 10 | Creator verified en `get_tasks` | ✅ API fields |

## Edge functions

| Slug | Rol |
|------|-----|
| `arcusx-api` | Marketplace + KYC submit/status |
| `arcusx-admin` | Admin + KYC moderation + domain events |
| `arcusx-escrow-reconcile` | Cron sync |
| `arcusx-email-worker` | Outbox |
| `arcusx-webhook-ingress` | Partners / KYC webhooks |
| `referral-*` | Referidos |

## Secrets requeridos

- `ARCUSX_JWT_SECRET`, `ARCUSX_CORS_ORIGINS`, `ARCUSX_CRON_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM` (email)
- `ARCUSX_WEBHOOK_SECRET` (opcional; si falta, ingress abierto solo para smoke)

## Acciones KYC (API)

| Acción | Función |
|--------|---------|
| `get_verification_status` | GET — estado propio |
| `submit_enterprise_kyc` | POST multipart |
| `list_kyc_requests` | GET admin |
| `approve_kyc` | POST admin |
| `reject_kyc` | POST admin |

## Pendiente no-backend

- Frontend: form KYB, badge en Hero cards, admin UI KYC
- Ops: dist cPanel, E2E checklist, cron cPanel
- PHP 410 policy

---

*Tranche 2 backend cerrado en código.*

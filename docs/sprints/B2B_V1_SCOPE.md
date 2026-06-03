# B2B v1 — Alcance simple (crecimiento)

**Decisión:** 2026-05-28 · **KYC/KYB sí, ahora** — flujo simple + badge en marketplace. Sin multi-usuario ni roles internos.

## Qué sí

- Una cuenta = un representante (dueño, RR.HH., etc.).
- Perfil empresa: razón social (ej. **San Jorge S.A**).
- **Backend ✅:** `submit_enterprise_kyc`, `get_verification_status`, admin `list_kyc_requests` / `approve_kyc` / `reject_kyc`.
- **API listados:** `get_tasks` devuelve `creator_display_name` + `creator_verified_enterprise`.
- **Frontend pendiente:** form KYB en `empresas.*`, badge visual en Hero/tarjetas, panel admin KYC.

## Qué no (por ahora)

- Varios usuarios por empresa, invitaciones, roles.
- Panel KYB complejo, integraciones externas de verificación.
- Duplicar backend; todo vía Supabase/Edge existente.

## Referencia futura

Plan detallado (no activo): `arcusx/docs/PLAN_CUENTA_EMPRESA_KYC.md`.

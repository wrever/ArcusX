# B2B v1 — Alcance simple (crecimiento)

**Decisión:** 2026-05-28 · **KYC/KYB sí, ahora** — flujo simple + badge en marketplace. Sin multi-usuario ni roles internos.  
**Sin alcance:** wallet embebida, proveedor KYC externo (Sumsub, etc.).

## Qué sí

- Una cuenta = un representante (dueño, RR.HH., etc.).
- Perfil empresa: razón social (ej. **San Jorge S.A**).
- **Backend:** `submit_enterprise_kyc`, `get_verification_status`, admin `list_kyc_requests` / `approve_kyc` / `reject_kyc`.
- **API listados:** `get_tasks` devuelve `creator_display_name` + `creator_verified_enterprise` / `creator_verified_individual`.
- **Frontend:** `EnterpriseKycPanel`, `AccountVerificationPanel`, `/dashboard/kyc`, `TaskCreatorLine` + `UsernameWithVerified` en Hero/dashboard, admin `KycManagement`.

## Qué no (por ahora)

- Varios usuarios por empresa, invitaciones, roles.
- Integraciones externas de verificación automática.
- Duplicar backend; todo vía Supabase/Edge existente.

## Referencia futura

Plan detallado (no activo): `arcusx/docs/PLAN_CUENTA_EMPRESA_KYC.md` (visión; no sprint activo).

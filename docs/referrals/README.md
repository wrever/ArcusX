# Referidos privados — ArcusX

Sistema de atribución de registros + anti-fraude. **Sin pagos automáticos** (supervisión manual).

| Doc | Contenido |
|-----|-----------|
| [PLAN_SISTEMA_REFERIDOS.md](./PLAN_SISTEMA_REFERIDOS.md) | Plan original |
| Este README | Despliegue y uso |

## Variables de entorno

**Copia maestra local:** `arcusx/.env` (bloque **sin** `VITE_`).

| Dónde | Qué |
|-------|-----|
| Supabase Edge Secrets | Ya configurado por ti |
| `arcusx/.env` | Mismos valores (no van al navegador) |
| Hosting PHP | Mismos `ARCUSX_*` y `REFERRAL_*` en SetEnv / env del servidor |

⚠️ Nunca `VITE_REFERRAL_INTERNAL_SECRET` ni `VITE_` + service role.

## Despliegue Supabase

1. Migración: `supabase/migrations/20260517180000_referral_program.sql`
2. Edge Secrets (hecho)
3. **Desplegar Edge Functions** (obligatorio; los Secrets solos no activan nada):

```bash
cd /ruta/ArcusX
supabase link --project-ref atgsesbstjleabesclzs
supabase functions deploy referral-admin --no-verify-jwt
supabase functions deploy referral-attribute-signup --no-verify-jwt
supabase functions deploy referral-resolve-code --no-verify-jwt
```

O en Dashboard → **Edge Functions** → subir carpetas de `supabase/functions/`.

| Function | verify_jwt |
|----------|------------|
| `referral-admin` | **OFF** (usa JWT PHP + `ARCUSX_JWT_SECRET`) |
| `referral-attribute-signup` | **OFF** (secret interno) |
| `referral-resolve-code` | **OFF** (pública) |

5. Secrets Edge (ya subidos): confirma **`ARCUSX_JWT_SECRET`** = mismo que PHP `ARCUSX_JWT_SECRET`.

## PHP (opcional)

Solo si usas `sync_supabase_user.php` para atribuir referidos. El **panel admin** va por Edge `referral-admin`, no por PHP.

## Flujo

1. Admin crea afiliado + código en **Panel → Referidos**
2. Compartes `https://arcusx.pro/ref/CODIGO`
3. Usuario se registra con OAuth → anti-fraude → `valid` o `rejected`
4. Si hay trampa → alerta en panel + **no cuenta** en métricas

## Anti-fraude activo

- Email ya existente
- Usuario duplicado
- IP cluster / global
- Reutilización de dispositivo
- Reutilización de cuenta OAuth
- Velocidad por código
- Emails desechables
- Códigos honeypot (`TRAP-*`)

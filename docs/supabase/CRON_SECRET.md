# ARCUSX_CRON_SECRET — qué es y si lo necesitás

ArcusX en producción **no usa Vercel**. Todo va en **Supabase Edge Secrets** + cron en **cPanel** (arcusx.pro).

## Qué es

Secret que vos generás (ej. `openssl rand -hex 32`) y guardás solo en:

**Supabase Dashboard → Project Settings → Edge Functions → Secrets → `ARCUSX_CRON_SECRET`**

Lo usan:

- `arcusx-escrow-reconcile`
- `arcusx-email-worker` (también acepta `Authorization: Bearer` con **service role** cuando `arcusx-api` dispara el worker en background)

Comportamiento:

- **Si el secret NO existe** → esas URLs son invocables sin auth (solo para smoke local).
- **Si el secret SÍ existe** → hace falta `Authorization: Bearer <secret>` o `x-cron-secret: <secret>` (o service role en el worker).

## Cron en cPanel (recomendado)

**cPanel → Cron Jobs** en el hosting de arcusx.pro. Reemplazá `TU_SECRET` por el valor de `ARCUSX_CRON_SECRET` en Supabase.

Reconcile escrow (1× al día, ej. 08:00 UTC):

```bash
curl -sS -X POST "https://atgsesbstjleabesclzs.supabase.co/functions/v1/arcusx-escrow-reconcile" \
  -H "Authorization: Bearer TU_SECRET"
```

Cola de email — reintentos si el disparo automático falló (cada 15–60 min o 1× al día):

```bash
curl -sS -X POST "https://atgsesbstjleabesclzs.supabase.co/functions/v1/arcusx-email-worker" \
  -H "Authorization: Bearer TU_SECRET"
```

Plantilla copiable: `scripts/cpanel-cron-edge.example.sh`

## Email sin cron externo

Al crear una notificación in-app, `arcusx-api` encola el mail y llama `arcusx-email-worker` con **service role** (`EdgeRuntime.waitUntil`). Con SMTP en Secrets, el correo sale en el mismo flujo; el cron de cPanel es **backup** para filas `pending`/`failed`.

## Otras opciones de cron

- **GitHub Actions** `schedule` con el mismo `curl`
- **Supabase pg_cron** / scheduled Edge (si tu plan lo incluye)

## No usar

- Variables en Vercel ni `arcusx/vercel.json` (legacy del repo; CertiX sí puede estar en Vercel, ArcusX no).

# Email — notificaciones@arcusx.pro

Todo el flujo sigue en **Supabase** (cola `arcusx_email_outbox` + Edge `arcusx-email-worker`).  
El cambio es el **transporte**: API HTTP (Resend), no SMTP directo al cPanel.

## Por qué no SMTP sin SSL desde Edge

`mail.arcusx.pro` **no acepta conexiones SMTP desde IPs externas** (Supabase, tu Mac → timeout en 465/587).  
Eso no se arregla desactivando SSL: el puerto ni siquiera responde desde fuera. Webmail en cPanel usa la red interna del hosting.

**Recomendado:** `RESEND_API_KEY` + dominio `arcusx.pro` verificado en [Resend](https://resend.com/domains).  
Sigue siendo “vía Supabase”: mismo worker, misma cola, remitente `notificaciones@arcusx.pro`.

---

## Secrets en Supabase (Edge Functions → Secrets)

### Opción A — Resend (recomendado)

| Secret | Valor |
|--------|--------|
| `RESEND_API_KEY` | `re_...` desde Resend → API Keys |
| `EMAIL_FROM` | `ArcusX <notificaciones@arcusx.pro>` |
| `ARCUSX_EMAIL_PROVIDER` | `resend` (opcional; si hay API key, Resend gana por defecto) |
| `ARCUSX_CRON_SECRET` | tu secret (cron cPanel + auth manual) |

En Resend: agregar dominio **arcusx.pro**, copiar registros DNS (SPF/DKIM) que te indiquen.

### Opción B — SMTP cPanel (solo si el hosting abre puertos a Edge)

| Secret | Valor |
|--------|--------|
| `SMTP_HOST` | `mail.arcusx.pro` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` (**no** desactivar SSL en producción) |
| `SMTP_USER` | `notificaciones@arcusx.pro` |
| `SMTP_PASS` | contraseña del buzón |
| `SMTP_FROM` | `ArcusX <notificaciones@arcusx.pro>` |
| `ARCUSX_EMAIL_PROVIDER` | `smtp` |

Si solo tenés SMTP y sigue `Connection timeout`, pasá a Resend.

---

## Cómo funciona en código

1. Evento → `insertArcusxNotification` (in-app + Realtime).
2. Si `emailConfigured()` → fila en `arcusx_email_outbox`.
3. `arcusx-api` dispara `arcusx-email-worker` (service role).
4. Worker envía con **Resend** (prioridad) o SMTP (fallback).
5. Cron cPanel opcional para reintentos — `CRON_SECRET.md`.

---

## Probar

Tras `RESEND_API_KEY` y deploy del worker:

```bash
curl -sS -X POST "https://atgsesbstjleabesclzs.supabase.co/functions/v1/arcusx-email-worker" \
  -H "Authorization: Bearer TU_ARCUSX_CRON_SECRET"
```

Respuesta esperada: `"provider":"resend"`, `"sent":1`.

```sql
SELECT id, to_email, status, error_message
FROM arcusx_email_outbox ORDER BY id DESC LIMIT 10;
```

---

## Eventos que envían email

Lista completa en **`EMAIL_NOTIFICATIONS.md`** (tareas, escrow, deals, disputas, ratings, admin).

## Deploy Edge

```bash
node scripts/bundle-edge-fn.mjs arcusx-api
node scripts/deploy-edge-from-bundle.mjs supabase/.deploy/arcusx-api.json
node scripts/bundle-edge-fn.mjs arcusx-admin
node scripts/deploy-edge-from-bundle.mjs supabase/.deploy/arcusx-admin.json
node scripts/bundle-edge-fn.mjs arcusx-email-worker
node scripts/deploy-edge-from-bundle.mjs supabase/.deploy/arcusx-email-worker.json
```

Migración cola: `20260531150000_email_notifications_outbox.sql`

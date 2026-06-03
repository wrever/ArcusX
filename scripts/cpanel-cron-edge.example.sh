#!/bin/bash
# Copiar a cPanel → Cron Jobs (una línea por job).
# Sustituir TU_SECRET por ARCUSX_CRON_SECRET de Supabase Edge Secrets.
# ArcusX NO usa Vercel; estos curls van directo a Supabase.

SUPABASE_URL="https://atgsesbstjleabesclzs.supabase.co"
SECRET="TU_SECRET"

# Reconcile escrow — 1×/día (ej. 0 8 * * *)
curl -sS -X POST "${SUPABASE_URL}/functions/v1/arcusx-escrow-reconcile" \
  -H "Authorization: Bearer ${SECRET}"

# Email outbox retry — cada hora o 1×/día (ej. 0 * * * * o 0 9 * * *)
curl -sS -X POST "${SUPABASE_URL}/functions/v1/arcusx-email-worker" \
  -H "Authorization: Bearer ${SECRET}"

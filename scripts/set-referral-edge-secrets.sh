#!/usr/bin/env bash
# Configura secrets de Edge Functions para referidos.
# Requiere: supabase CLI logueado y proyecto enlazado (supabase link).
#
# Uso:
#   ./scripts/set-referral-edge-secrets.sh
#   ARCUSX_JWT_SECRET="tu-jwt-php" REFERRAL_ADMIN_MYSQL_IDS="1" ./scripts/set-referral-edge-secrets.sh

set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Instala Supabase CLI: https://supabase.com/docs/guides/cli"
  exit 1
fi

# Generar si no existen en el entorno
REFERRAL_INTERNAL_SECRET="${REFERRAL_INTERNAL_SECRET:-$(openssl rand -hex 32)}"
REFERRAL_HASH_SALT="${REFERRAL_HASH_SALT:-$(openssl rand -hex 32)}"
REFERRAL_ADMIN_MYSQL_IDS="${REFERRAL_ADMIN_MYSQL_IDS:-1}"
REFERRAL_CORS_ORIGINS="${REFERRAL_CORS_ORIGINS:-https://arcusx.pro,https://www.arcusx.pro,http://localhost:5173}"

if [[ -z "${ARCUSX_JWT_SECRET:-}" ]]; then
  echo "AVISO: ARCUSX_JWT_SECRET no está definido."
  echo "  Debe ser el mismo que en PHP (ARCUSX_JWT_SECRET). Ejemplo:"
  echo '  ARCUSX_JWT_SECRET="..." ./scripts/set-referral-edge-secrets.sh'
  echo ""
  read -r -p "¿Continuar sin ARCUSX_JWT_SECRET? (solo afecta referral-admin) [y/N] " ans
  [[ "${ans,,}" == "y" ]] || exit 1
fi

ARGS=(
  "REFERRAL_INTERNAL_SECRET=${REFERRAL_INTERNAL_SECRET}"
  "REFERRAL_HASH_SALT=${REFERRAL_HASH_SALT}"
  "REFERRAL_ADMIN_MYSQL_IDS=${REFERRAL_ADMIN_MYSQL_IDS}"
  "REFERRAL_CORS_ORIGINS=${REFERRAL_CORS_ORIGINS}"
)

if [[ -n "${ARCUSX_JWT_SECRET:-}" ]]; then
  ARGS+=("ARCUSX_JWT_SECRET=${ARCUSX_JWT_SECRET}")
fi

echo "Subiendo secrets a Supabase Edge..."
supabase secrets set "${ARGS[@]}"

echo ""
echo "=== Copia también en el servidor PHP (backend_externo) ==="
echo "REFERRAL_INTERNAL_SECRET=${REFERRAL_INTERNAL_SECRET}"
echo "REFERRAL_HASH_SALT=${REFERRAL_HASH_SALT}"
echo "REFERRAL_ADMIN_MYSQL_IDS=${REFERRAL_ADMIN_MYSQL_IDS}"
echo "ARCUSX_SUPABASE_URL=https://atgsesbstjleabesclzs.supabase.co"
echo "ARCUSX_SUPABASE_SERVICE_ROLE_KEY=<service_role desde Dashboard → Settings → API>"
echo ""
echo "Listo. Despliega functions si aún no:"
echo "  supabase functions deploy referral-attribute-signup --no-verify-jwt"
echo "  supabase functions deploy referral-resolve-code --no-verify-jwt"
echo "  supabase functions deploy referral-admin"

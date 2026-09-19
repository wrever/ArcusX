-- Garantía global: ningún hash de API key duplicado (activa o revocada).
-- El texto plano nunca se almacena; colisión = reintentar generación en Edge.

DROP INDEX IF EXISTS arcusx_partner_keys_hash_active_idx;

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_partner_keys_key_hash_unique_idx
  ON public.arcusx_partner_keys (key_hash);

COMMENT ON INDEX arcusx_partner_keys_key_hash_unique_idx IS
  'Un hash por key en todo el sistema; imposible reutilizar el mismo secreto.';

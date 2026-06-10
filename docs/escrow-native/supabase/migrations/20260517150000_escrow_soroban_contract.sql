-- Pivot Soroban: escrow_public_key almacena contractId C… (no cuenta G…)
-- escrow_secret_enc ya no se usa en flujo Soroban

ALTER TABLE public.arcusx_escrows
  ALTER COLUMN escrow_secret_enc DROP NOT NULL;

COMMENT ON COLUMN public.arcusx_escrows.escrow_public_key IS
  'Contract ID Soroban (C…) o legacy G…; flujo nativo v2 = solo C…';

ALTER TABLE public.arcusx_escrows
  DROP CONSTRAINT IF EXISTS arcusx_escrows_escrow_provider_check;

ALTER TABLE public.arcusx_escrows
  ADD CONSTRAINT arcusx_escrows_escrow_provider_check
  CHECK (escrow_provider IN ('native', 'native_soroban', 'trustless_work'));

-- Estado intermedio: deploy firmado, pendiente fund
ALTER TABLE public.arcusx_escrows
  DROP CONSTRAINT IF EXISTS arcusx_escrows_escrow_status_check;

ALTER TABLE public.arcusx_escrows
  ADD CONSTRAINT arcusx_escrows_escrow_status_check
  CHECK (escrow_status IN (
    'pending_deploy',
    'pending_funding',
    'active',
    'completed',
    'disputed',
    'cancelled'
  ));

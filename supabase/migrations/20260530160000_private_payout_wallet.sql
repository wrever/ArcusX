-- Wallet de cobro solo para ofertas privadas (registro explícito en Configuración).
-- No confundir con wallet_address (legacy / Freighter u otros flujos).
ALTER TABLE public.arcusx_users
  ADD COLUMN IF NOT EXISTS private_payout_wallet text;

COMMENT ON COLUMN public.arcusx_users.private_payout_wallet IS
  'Dirección Stellar G… registrada en Configuración para recibir ofertas privadas.';

CREATE INDEX IF NOT EXISTS idx_arcusx_users_private_payout_wallet
  ON public.arcusx_users (private_payout_wallet)
  WHERE private_payout_wallet IS NOT NULL;

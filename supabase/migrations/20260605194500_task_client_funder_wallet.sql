-- Wallet Stellar con la que el cliente firmó al crear/fondear el escrow (empleador real).
ALTER TABLE public.arcusx_tasks
  ADD COLUMN IF NOT EXISTS client_funder_wallet text;

COMMENT ON COLUMN public.arcusx_tasks.client_funder_wallet IS
  'G… del cliente al desplegar/fondear escrow TW; no usar treasury del perfil.';

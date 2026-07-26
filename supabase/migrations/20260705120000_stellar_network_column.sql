-- Persist Stellar network per escrow record (testnet | mainnet).

ALTER TABLE public.arcusx_tasks
  ADD COLUMN IF NOT EXISTS stellar_network text NOT NULL DEFAULT 'testnet'
    CHECK (stellar_network IN ('testnet', 'mainnet'));

ALTER TABLE public.arcusx_agreements
  ADD COLUMN IF NOT EXISTS stellar_network text NOT NULL DEFAULT 'testnet'
    CHECK (stellar_network IN ('testnet', 'mainnet'));

COMMENT ON COLUMN public.arcusx_tasks.stellar_network IS 'Red Stellar del escrow (testnet o mainnet)';
COMMENT ON COLUMN public.arcusx_agreements.stellar_network IS 'Red Stellar del escrow del deal (testnet o mainnet)';

CREATE INDEX IF NOT EXISTS idx_arcusx_tasks_stellar_network
  ON public.arcusx_tasks (stellar_network);

CREATE INDEX IF NOT EXISTS idx_arcusx_agreements_stellar_network
  ON public.arcusx_agreements (stellar_network);

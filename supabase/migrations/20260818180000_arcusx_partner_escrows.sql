-- Partner escrow rail: API-key-only USDC escrow (no ArcusX user JWT).
-- Integrators pass wallets + amount; ArcusX applies platform fee server-side (TW hidden).

CREATE TABLE IF NOT EXISTS public.arcusx_partner_escrows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.arcusx_partners(id) ON DELETE CASCADE,
  external_id text,
  engagement_id text NOT NULL,
  title text,
  description text,
  client_wallet text NOT NULL,
  worker_wallet text NOT NULL,
  amount_usdc numeric NOT NULL CHECK (amount_usdc > 0),
  fund_amount numeric NOT NULL CHECK (fund_amount > 0),
  platform_fee numeric NOT NULL,
  contract_id text,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN (
      'created',
      'deploy_prepared',
      'deployed',
      'funded',
      'released',
      'cancelled',
      'disputed'
    )),
  deploy_tx_hash text,
  fund_tx_hash text,
  release_tx_hash text,
  stellar_network text NOT NULL DEFAULT 'testnet',
  quote jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_partner_escrows_partner_external_idx
  ON public.arcusx_partner_escrows (partner_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS arcusx_partner_escrows_partner_created_idx
  ON public.arcusx_partner_escrows (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS arcusx_partner_escrows_contract_idx
  ON public.arcusx_partner_escrows (contract_id)
  WHERE contract_id IS NOT NULL;

COMMENT ON TABLE public.arcusx_partner_escrows IS
  'Standalone escrow for B2B partners (API key + wallets + amount). No task/JWT required.';

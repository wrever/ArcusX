-- Partner deals (payment links) — API key only, linked to partner escrows.

CREATE TABLE IF NOT EXISTS public.arcusx_partner_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.arcusx_partners(id) ON DELETE CASCADE,
  deal_token text NOT NULL UNIQUE,
  external_id text,
  title text NOT NULL,
  description text,
  amount_usdc numeric NOT NULL CHECK (amount_usdc > 0),
  payee_wallet text NOT NULL,
  payer_wallet text,
  escrow_id uuid REFERENCES public.arcusx_partner_escrows(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN (
      'open',
      'escrow_prepared',
      'deployed',
      'funded',
      'released',
      'cancelled'
    )),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_partner_deals_partner_external_idx
  ON public.arcusx_partner_deals (partner_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS arcusx_partner_deals_partner_created_idx
  ON public.arcusx_partner_deals (partner_id, created_at DESC);

COMMENT ON TABLE public.arcusx_partner_deals IS
  'Payment-link deals for B2B partners (API key). Links to arcusx_partner_escrows.';

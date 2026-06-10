-- Escrow nativo ArcusX — core schema (Supabase Postgres)
-- Comisión default: 150 bps cliente + 150 bps freelancer = 3% total

-- Config clave-valor (fees, flags)
CREATE TABLE IF NOT EXISTS public.arcusx_system_config (
  config_key text PRIMARY KEY,
  config_value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.arcusx_system_config IS 'Config global ArcusX; fees escrow nativo y feature flags.';

INSERT INTO public.arcusx_system_config (config_key, config_value) VALUES
  ('client_fee_bps', to_jsonb(150)),
  ('freelancer_fee_bps', to_jsonb(150)),
  ('escrow_native_enabled', to_jsonb(false))
ON CONFLICT (config_key) DO NOTHING;

-- Cuentas escrow Stellar (G...)
CREATE TABLE IF NOT EXISTS public.arcusx_escrows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id bigint NOT NULL,
  proposal_id bigint,
  escrow_public_key text NOT NULL,
  escrow_secret_enc text NOT NULL,
  escrow_provider text NOT NULL DEFAULT 'native' CHECK (escrow_provider IN ('native', 'trustless_work')),
  worker_amount numeric(18, 7) NOT NULL,
  client_total numeric(18, 7),
  freelancer_payout numeric(18, 7),
  platform_fee_total numeric(18, 7),
  escrow_status text NOT NULL DEFAULT 'pending_funding'
    CHECK (escrow_status IN ('pending_funding', 'active', 'completed', 'disputed', 'cancelled')),
  fund_tx_hash text,
  release_tx_hash text,
  client_wallet text NOT NULL,
  freelancer_wallet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  funded_at timestamptz,
  completed_at timestamptz,
  UNIQUE (task_id),
  UNIQUE (escrow_public_key)
);

CREATE INDEX IF NOT EXISTS arcusx_escrows_status_idx ON public.arcusx_escrows (escrow_status);

COMMENT ON TABLE public.arcusx_escrows IS 'Escrow nativo: una fila por tarea (single-milestone v1).';

-- Milestone único (v1)
CREATE TABLE IF NOT EXISTS public.arcusx_escrow_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id uuid NOT NULL REFERENCES public.arcusx_escrows (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'approved')),
  evidence_url text,
  completed_at timestamptz,
  approved_at timestamptz,
  UNIQUE (escrow_id)
);

ALTER TABLE public.arcusx_system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_escrow_milestones ENABLE ROW LEVEL SECURITY;

-- Lectura config pública de fees (solo keys de fee)
CREATE POLICY arcusx_system_config_read_fees
  ON public.arcusx_system_config FOR SELECT
  TO authenticated, anon
  USING (config_key IN ('client_fee_bps', 'freelancer_fee_bps'));

-- Escrows: lectura si wallet coincide (simplificado; Edge usa service_role para writes)
CREATE POLICY arcusx_escrows_select_participant
  ON public.arcusx_escrows FOR SELECT
  TO authenticated
  USING (true); -- refinar con auth.uid() ↔ users cuando tasks estén en Supabase

-- Writes vía service_role / Edge Functions únicamente
REVOKE INSERT, UPDATE, DELETE ON public.arcusx_escrows FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.arcusx_escrow_milestones FROM authenticated, anon;
GRANT SELECT ON public.arcusx_escrows TO authenticated;
GRANT SELECT ON public.arcusx_escrow_milestones TO authenticated;

-- Panel admin + alertas de seguridad + disputas nativas

-- Admins Supabase (vinculado a auth.users)
CREATE TABLE IF NOT EXISTS public.arcusx_admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.arcusx_admin_users IS
  'Usuarios con acceso a Edge Functions admin escrow (además de ARCUSX_ADMIN_WALLETS).';

-- Disputas (off-chain; resolve on-chain vía Edge)
CREATE TABLE IF NOT EXISTS public.arcusx_escrow_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id uuid NOT NULL REFERENCES public.arcusx_escrows (id) ON DELETE CASCADE,
  task_id bigint NOT NULL,
  reason text NOT NULL,
  opened_by_user_id uuid REFERENCES auth.users (id),
  opened_by_wallet text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved', 'cancelled')),
  client_amount numeric(18, 7),
  freelancer_amount numeric(18, 7),
  resolve_tx_hash text,
  resolved_by_user_id uuid REFERENCES auth.users (id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escrow_id)
);

CREATE INDEX IF NOT EXISTS arcusx_escrow_disputes_status_idx
  ON public.arcusx_escrow_disputes (status);

-- Alertas de seguridad (multisig, montos, intentos sospechosos)
CREATE TABLE IF NOT EXISTS public.arcusx_security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  alert_type text NOT NULL,
  task_id bigint,
  escrow_public_key text,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users (id),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arcusx_security_alerts_open_idx
  ON public.arcusx_security_alerts (acknowledged, severity, created_at DESC);

-- Último escaneo de integridad on-chain por escrow
CREATE TABLE IF NOT EXISTS public.arcusx_escrow_integrity_checks (
  escrow_public_key text PRIMARY KEY,
  task_id bigint,
  multisig_ok boolean NOT NULL,
  balance_usdc numeric(18, 7),
  balance_xlm numeric(18, 7),
  signers_snapshot jsonb,
  error_message text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

-- Congelar liberación (incidente / investigación)
ALTER TABLE public.arcusx_escrows
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS frozen_reason text,
  ADD COLUMN IF NOT EXISTS dispute_reason text;

-- Vista agregada para dashboard admin
CREATE OR REPLACE VIEW public.v_arcusx_escrow_admin_stats AS
SELECT
  count(*)::int AS total_escrows,
  count(*) FILTER (WHERE escrow_status = 'active')::int AS active_count,
  count(*) FILTER (WHERE escrow_status = 'pending_funding')::int AS pending_funding_count,
  count(*) FILTER (WHERE escrow_status = 'disputed')::int AS disputed_count,
  count(*) FILTER (WHERE escrow_status = 'completed')::int AS completed_count,
  count(*) FILTER (WHERE escrow_status = 'cancelled')::int AS cancelled_count,
  count(*) FILTER (WHERE frozen_at IS NOT NULL)::int AS frozen_count,
  coalesce(sum(client_total) FILTER (WHERE escrow_status IN ('active', 'disputed')), 0) AS locked_usdc,
  coalesce(sum(platform_fee_total) FILTER (WHERE escrow_status = 'completed'), 0) AS fees_collected_usdc,
  coalesce(sum(client_total) FILTER (WHERE escrow_status = 'completed'), 0) AS volume_completed_usdc
FROM public.arcusx_escrows
WHERE escrow_provider = 'native';

-- RLS: solo admins leen alertas y vista
ALTER TABLE public.arcusx_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_escrow_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_escrow_integrity_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY arcusx_admin_users_self
  ON public.arcusx_admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.arcusx_admin_users FROM authenticated, anon;
REVOKE ALL ON public.arcusx_security_alerts FROM authenticated, anon;
REVOKE ALL ON public.arcusx_escrow_disputes FROM authenticated, anon;
REVOKE ALL ON public.arcusx_escrow_integrity_checks FROM authenticated, anon;

-- service_role + Edge para todo write/read admin

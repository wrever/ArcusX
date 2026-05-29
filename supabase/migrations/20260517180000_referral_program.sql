-- Programa de referidos privado (atribución + anti-fraude). Sin pagos automáticos.

-- Partners (personas dueñas del link, creados por admin)
CREATE TABLE IF NOT EXISTS public.referral_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  contact_email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.referral_partners (id) ON DELETE CASCADE,
  code text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_signups int,
  signup_count int NOT NULL DEFAULT 0,
  valid_signup_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_code_normalized CHECK (code = upper(trim(code))),
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_code_active_uidx
  ON public.referral_codes (code)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS referral_codes_partner_idx ON public.referral_codes (partner_id);

-- Registros atribuidos (solo status = valid cuenta en métricas)
CREATE TABLE IF NOT EXISTS public.referral_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.referral_codes (id),
  partner_id uuid NOT NULL REFERENCES public.referral_partners (id),
  supabase_user_id uuid NOT NULL,
  mysql_user_id bigint,
  ref_code text NOT NULL,
  partner_display_name text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  signup_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  signup_ip_hash text,
  device_fp_hash text,
  user_agent_hash text,
  oauth_provider text,
  oauth_subject_hash text,
  is_new_user boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'valid', 'rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_signups_supabase_user_unique UNIQUE (supabase_user_id)
);

CREATE INDEX IF NOT EXISTS referral_signups_partner_date_idx
  ON public.referral_signups (partner_id, signup_date DESC);

CREATE INDEX IF NOT EXISTS referral_signups_code_idx ON public.referral_signups (code_id);
CREATE INDEX IF NOT EXISTS referral_signups_status_idx ON public.referral_signups (status);
CREATE INDEX IF NOT EXISTS referral_signups_ip_hash_idx ON public.referral_signups (signup_ip_hash);
CREATE INDEX IF NOT EXISTS referral_signups_device_fp_idx ON public.referral_signups (device_fp_hash);

-- Flags de fraude
CREATE TABLE IF NOT EXISTS public.referral_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id uuid NOT NULL REFERENCES public.referral_signups (id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_flags_signup_idx ON public.referral_flags (signup_id);

-- Alertas para admin (notificación de intento de trampa)
CREATE TABLE IF NOT EXISTS public.referral_fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id uuid REFERENCES public.referral_signups (id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.referral_partners (id) ON DELETE SET NULL,
  code_id uuid REFERENCES public.referral_codes (id) ON DELETE SET NULL,
  ref_code text,
  partner_display_name text,
  severity text NOT NULL DEFAULT 'high'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  flag_types text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_fraud_alerts_unread_idx
  ON public.referral_fraud_alerts (is_read, created_at DESC);

-- Huellas conocidas (dispositivo / OAuth) para detectar reutilización
CREATE TABLE IF NOT EXISTS public.referral_device_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fp_hash text NOT NULL,
  supabase_user_id uuid NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_device_registry_unique UNIQUE (device_fp_hash, supabase_user_id)
);

CREATE INDEX IF NOT EXISTS referral_device_registry_fp_idx
  ON public.referral_device_registry (device_fp_hash);

CREATE TABLE IF NOT EXISTS public.referral_oauth_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oauth_provider text NOT NULL,
  oauth_subject_hash text NOT NULL,
  supabase_user_id uuid NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_oauth_registry_unique UNIQUE (oauth_provider, oauth_subject_hash)
);

-- Totales diarios (solo signups valid)
CREATE TABLE IF NOT EXISTS public.referral_daily_totals (
  partner_id uuid NOT NULL REFERENCES public.referral_partners (id) ON DELETE CASCADE,
  stat_date date NOT NULL,
  valid_count int NOT NULL DEFAULT 0,
  rejected_count int NOT NULL DEFAULT 0,
  pending_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, stat_date)
);

-- RLS: sin acceso directo desde cliente
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_device_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_oauth_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_daily_totals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.referral_partners FROM anon, authenticated;
REVOKE ALL ON public.referral_codes FROM anon, authenticated;
REVOKE ALL ON public.referral_signups FROM anon, authenticated;
REVOKE ALL ON public.referral_flags FROM anon, authenticated;
REVOKE ALL ON public.referral_fraud_alerts FROM anon, authenticated;
REVOKE ALL ON public.referral_device_registry FROM anon, authenticated;
REVOKE ALL ON public.referral_oauth_registry FROM anon, authenticated;
REVOKE ALL ON public.referral_daily_totals FROM anon, authenticated;

-- Función: refrescar contadores diarios y del código
CREATE OR REPLACE FUNCTION public.referral_refresh_daily_totals(
  p_partner_id uuid,
  p_stat_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.referral_daily_totals (partner_id, stat_date, valid_count, rejected_count, pending_count, updated_at)
  SELECT
    p_partner_id,
    p_stat_date,
    COUNT(*) FILTER (WHERE status = 'valid'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    now()
  FROM public.referral_signups
  WHERE partner_id = p_partner_id AND signup_date = p_stat_date
  ON CONFLICT (partner_id, stat_date) DO UPDATE SET
    valid_count = EXCLUDED.valid_count,
    rejected_count = EXCLUDED.rejected_count,
    pending_count = EXCLUDED.pending_count,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.referral_refresh_daily_totals(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_refresh_daily_totals(uuid, date) TO service_role;

COMMENT ON TABLE public.referral_signups IS
  'Solo status=valid cuenta para métricas de campaña. rejected = fraude o registro inválido.';

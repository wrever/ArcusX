-- Rastro de referido en servidor (paralelo a OAuth): sobrevive pérdida de localStorage en móvil

CREATE TABLE IF NOT EXISTS public.referral_pending_attributions (
  device_fp text PRIMARY KEY,
  ref_code text NOT NULL,
  signup_ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  claimed_at timestamptz,
  supabase_user_id uuid
);

CREATE INDEX IF NOT EXISTS referral_pending_unclaimed_idx
  ON public.referral_pending_attributions (expires_at)
  WHERE claimed_at IS NULL;

ALTER TABLE public.referral_pending_attributions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referral_pending_attributions FROM anon, authenticated;

COMMENT ON TABLE public.referral_pending_attributions IS
  'Vincula device_fp → ref_code antes del OAuth; se consume en referral-attribute-signup.';

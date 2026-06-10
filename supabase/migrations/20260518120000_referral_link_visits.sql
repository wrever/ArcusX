-- Visitas a enlaces de referido (clicks antes del registro)

CREATE TABLE IF NOT EXISTS public.referral_link_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.referral_codes (id) ON DELETE CASCADE,
  ref_code text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now(),
  visitor_ip_hash text,
  device_fp_hash text,
  user_agent_hash text
);

CREATE INDEX IF NOT EXISTS referral_link_visits_code_idx
  ON public.referral_link_visits (code_id, visited_at DESC);

ALTER TABLE public.referral_link_visits ENABLE ROW LEVEL SECURITY;

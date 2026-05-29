-- Contador de hits a endpoints públicos de referidos (rate limit anti-abuso)

CREATE TABLE IF NOT EXISTS public.referral_api_hits (
  id bigserial PRIMARY KEY,
  ip_hash text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_api_hits_rate_idx
  ON public.referral_api_hits (ip_hash, endpoint, created_at DESC);

ALTER TABLE public.referral_api_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referral_api_hits FROM anon, authenticated;

REVOKE ALL ON public.referral_link_visits FROM anon, authenticated;

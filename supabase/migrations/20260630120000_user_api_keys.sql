-- API keys por cuenta de usuario (dashboard → SDK / agentic payments)
-- Un partner personal por usuario; keys en arcusx_partner_keys (existente).

ALTER TABLE public.arcusx_partners
  ADD COLUMN IF NOT EXISTS owner_user_id bigint REFERENCES public.arcusx_users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_partners_owner_user_idx
  ON public.arcusx_partners (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

ALTER TABLE public.arcusx_partner_keys
  ADD COLUMN IF NOT EXISTS key_prefix text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

COMMENT ON COLUMN public.arcusx_partners.owner_user_id IS 'Cuenta ArcusX dueña (dashboard Config → API keys). NULL = partner B2B admin.';

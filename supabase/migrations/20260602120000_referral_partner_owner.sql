-- Vincula un partner de referidos al usuario ArcusX (embajador badge).
ALTER TABLE public.referral_partners
  ADD COLUMN IF NOT EXISTS owner_mysql_user_id bigint REFERENCES public.arcusx_users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_referral_partners_owner_mysql
  ON public.referral_partners (owner_mysql_user_id)
  WHERE owner_mysql_user_id IS NOT NULL;

COMMENT ON COLUMN public.referral_partners.owner_mysql_user_id IS 'Usuario ArcusX dueño del link (badge Embajador).';

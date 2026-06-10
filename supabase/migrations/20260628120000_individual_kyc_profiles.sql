-- Perfil KYC persona natural (marketplace público)

CREATE TABLE IF NOT EXISTS public.arcusx_individual_kyc_profiles (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL UNIQUE REFERENCES public.arcusx_users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  document_id text NOT NULL,
  country text DEFAULT 'CL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arcusx_individual_kyc_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arcusx_individual_kyc_profiles FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.arcusx_individual_kyc_profiles TO postgres, service_role;

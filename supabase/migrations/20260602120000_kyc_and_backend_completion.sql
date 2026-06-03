-- KYC/KYB empresa (simple) + webhook inbox — cierre backend Tranche 2

ALTER TABLE public.arcusx_users
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_by bigint REFERENCES public.arcusx_users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason text;

ALTER TABLE public.arcusx_users
  DROP CONSTRAINT IF EXISTS arcusx_users_account_type_check;
ALTER TABLE public.arcusx_users
  ADD CONSTRAINT arcusx_users_account_type_check
  CHECK (account_type IN ('individual', 'enterprise'));

ALTER TABLE public.arcusx_users
  DROP CONSTRAINT IF EXISTS arcusx_users_kyc_status_check;
ALTER TABLE public.arcusx_users
  ADD CONSTRAINT arcusx_users_kyc_status_check
  CHECK (kyc_status IN ('not_required', 'pending', 'under_review', 'approved', 'rejected'));

CREATE TABLE IF NOT EXISTS public.arcusx_enterprise_profiles (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL UNIQUE REFERENCES public.arcusx_users (id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  trade_name text,
  tax_id text,
  country text DEFAULT 'CL',
  representative_name text,
  representative_role text,
  website text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.arcusx_kyc_requests (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.arcusx_users (id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'enterprise' CHECK (request_type IN ('enterprise', 'individual')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  review_notes text,
  rejection_reason text,
  reviewed_by bigint REFERENCES public.arcusx_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON public.arcusx_kyc_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_user ON public.arcusx_kyc_requests (user_id);

CREATE TABLE IF NOT EXISTS public.arcusx_kyc_documents (
  id bigserial PRIMARY KEY,
  kyc_request_id bigint NOT NULL REFERENCES public.arcusx_kyc_requests (id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'registration',
  storage_path text NOT NULL,
  original_filename text,
  mime_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.arcusx_webhook_inbox (
  id bigserial PRIMARY KEY,
  source text NOT NULL DEFAULT 'external',
  event_type text NOT NULL,
  payload jsonb,
  signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  process_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_inbox_unprocessed
  ON public.arcusx_webhook_inbox (processed, created_at DESC)
  WHERE processed = false;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('kyc-documents', 'kyc-documents', false, 10485760)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.arcusx_enterprise_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_kyc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_webhook_inbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.arcusx_enterprise_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.arcusx_kyc_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.arcusx_kyc_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.arcusx_webhook_inbox FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.arcusx_enterprise_profiles TO postgres, service_role;
GRANT ALL ON TABLE public.arcusx_kyc_requests TO postgres, service_role;
GRANT ALL ON TABLE public.arcusx_kyc_documents TO postgres, service_role;
GRANT ALL ON TABLE public.arcusx_webhook_inbox TO postgres, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMENT ON COLUMN public.arcusx_users.kyc_status IS 'not_required|pending|under_review|approved|rejected';

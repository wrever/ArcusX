-- ArcusX B2B partners (SDK / REST v1 multi-tenant)
-- Plan: docs/sdk/PLAN_MAESTRO.md T3-01
-- NOT referral_partners — tabla distinta para embajadores

CREATE TABLE IF NOT EXISTS arcusx_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sandbox boolean NOT NULL DEFAULT true,
  webhook_url text,
  platform_fee_override numeric,
  contact_email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arcusx_partner_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES arcusx_partners(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  label text NOT NULL DEFAULT 'default',
  sandbox boolean NOT NULL DEFAULT true,
  rate_limit_per_min int NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_partner_keys_hash_active_idx
  ON arcusx_partner_keys (key_hash)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS arcusx_partner_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES arcusx_partners(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  ip inet,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arcusx_partner_audit_partner_created_idx
  ON arcusx_partner_audit_log (partner_id, created_at DESC);

-- Enlace en recursos existentes
ALTER TABLE arcusx_tasks
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES arcusx_partners(id),
  ADD COLUMN IF NOT EXISTS external_id text;

ALTER TABLE arcusx_agreements
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES arcusx_partners(id),
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_tasks_partner_external_idx
  ON arcusx_tasks (partner_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_agreements_partner_external_idx
  ON arcusx_agreements (partner_id, external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON TABLE arcusx_partners IS 'B2B integrators (SDK/API). Distinct from referral_partners.';
COMMENT ON COLUMN arcusx_tasks.external_id IS 'Partner CRM id; unique per partner_id';

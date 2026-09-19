-- Agentic payments: jobs / subjobs (Work Execution Layer for agents)
-- Maps to arcusx_tasks for escrow (TW → Soroban) — see docs/agentic-payments/

CREATE TABLE IF NOT EXISTS arcusx_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id bigint NOT NULL REFERENCES arcusx_users(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES arcusx_partners(id) ON DELETE SET NULL,
  external_ref text,
  title text NOT NULL,
  description text,
  payer_wallet text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_jobs_partner_external_idx
  ON arcusx_jobs (partner_id, external_ref)
  WHERE external_ref IS NOT NULL AND partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS arcusx_jobs_owner_created_idx
  ON arcusx_jobs (owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS arcusx_subjobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES arcusx_jobs(id) ON DELETE CASCADE,
  task_id bigint REFERENCES arcusx_tasks(id) ON DELETE SET NULL,
  proposal_id bigint REFERENCES arcusx_applications(id) ON DELETE SET NULL,
  external_ref text,
  executor_type text NOT NULL DEFAULT 'agent'
    CHECK (executor_type IN ('human', 'agent', 'service')),
  executor_wallet text NOT NULL,
  executor_user_id bigint REFERENCES arcusx_users(id) ON DELETE SET NULL,
  worker_amount numeric(20, 7) NOT NULL,
  completion_condition text NOT NULL DEFAULT 'manual_approve'
    CHECK (completion_condition IN (
      'manual_approve', 'api_callback', 'webhook_attestation', 'verifier_agent', 'certix_approved'
    )),
  verification_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'task_created', 'funded', 'in_progress', 'completed', 'released', 'disputed', 'cancelled'
    )),
  escrow_contract_id text,
  attestation_hash text,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_subjobs_job_external_idx
  ON arcusx_subjobs (job_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS arcusx_subjobs_job_status_idx
  ON arcusx_subjobs (job_id, status);

CREATE INDEX IF NOT EXISTS arcusx_subjobs_task_idx
  ON arcusx_subjobs (task_id)
  WHERE task_id IS NOT NULL;

COMMENT ON TABLE arcusx_jobs IS 'Agentic orchestrator root job (API /v1/jobs)';
COMMENT ON TABLE arcusx_subjobs IS 'Unit of paid work; links to arcusx_tasks for escrow lifecycle';

-- External Web3 jobs board (aggregated from public job APIs).
-- Shown in dashboard AFTER ArcusX platform tasks, tagged "externa".

CREATE TABLE IF NOT EXISTS public.arcusx_external_jobs (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  source_job_id text NOT NULL,
  title text NOT NULL,
  company text,
  location text,
  salary_text text,
  tags text[] NOT NULL DEFAULT '{}',
  apply_url text NOT NULL,
  company_logo text,
  excerpt text,
  posted_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  raw jsonb,
  UNIQUE (source, source_job_id)
);

CREATE INDEX IF NOT EXISTS idx_arcusx_external_jobs_active_posted
  ON public.arcusx_external_jobs (is_active, posted_at DESC NULLS LAST);

COMMENT ON TABLE public.arcusx_external_jobs IS
  'Jobs Web3 externos agregados (Jobicy/RemoteOK/etc). CTA = apply_url externo.';

ALTER TABLE public.arcusx_external_jobs ENABLE ROW LEVEL SECURITY;

-- Public read of active jobs (anon + authenticated); writes only via service role / Edge.
DROP POLICY IF EXISTS arcusx_external_jobs_public_read ON public.arcusx_external_jobs;
CREATE POLICY arcusx_external_jobs_public_read
  ON public.arcusx_external_jobs
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

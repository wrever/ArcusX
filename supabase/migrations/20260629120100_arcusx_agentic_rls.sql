-- RLS hardening for agentic tables (service_role only, same as arcusx_tasks)

ALTER TABLE public.arcusx_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_subjobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.arcusx_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.arcusx_subjobs FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.arcusx_jobs TO postgres, service_role;
GRANT ALL ON TABLE public.arcusx_subjobs TO postgres, service_role;

CREATE INDEX IF NOT EXISTS arcusx_subjobs_executor_user_idx
  ON arcusx_subjobs (executor_user_id, status)
  WHERE executor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS arcusx_jobs_partner_created_idx
  ON arcusx_jobs (partner_id, created_at DESC)
  WHERE partner_id IS NOT NULL;

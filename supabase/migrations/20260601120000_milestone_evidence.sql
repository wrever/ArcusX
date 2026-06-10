-- Milestone evidence: Storage bucket + registro por tarea/hito

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('milestone-evidence', 'milestone-evidence', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.arcusx_milestone_evidence (
  id bigserial PRIMARY KEY,
  task_id bigint NOT NULL REFERENCES public.arcusx_tasks (id) ON DELETE CASCADE,
  milestone_index integer NOT NULL DEFAULT 0,
  user_id bigint NOT NULL REFERENCES public.arcusx_users (id) ON DELETE CASCADE,
  note text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arcusx_milestone_evidence_task_milestone UNIQUE (task_id, milestone_index)
);

CREATE INDEX IF NOT EXISTS idx_milestone_evidence_task
  ON public.arcusx_milestone_evidence (task_id, created_at DESC);

ALTER TABLE public.arcusx_milestone_evidence ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.arcusx_milestone_evidence IS 'Evidencia de entrega por tarea (hito 0 = single-release TW)';

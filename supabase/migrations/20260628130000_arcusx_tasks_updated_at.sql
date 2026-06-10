-- Edge handlers (create_escrow, complete_task, cancel_task, mark_work_started, …) usan updated_at.
ALTER TABLE public.arcusx_tasks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.arcusx_tasks.updated_at IS 'Última mutación de la tarea (Edge arcusx-api).';

UPDATE public.arcusx_tasks
SET updated_at = COALESCE(
  escrow_completed_at,
  escrow_created_at,
  completed_at,
  cancellation_requested_at,
  created_at,
  now()
);

CREATE OR REPLACE FUNCTION public.arcusx_tasks_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_arcusx_tasks_updated_at ON public.arcusx_tasks;
CREATE TRIGGER trg_arcusx_tasks_updated_at
  BEFORE UPDATE ON public.arcusx_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.arcusx_tasks_touch_updated_at();

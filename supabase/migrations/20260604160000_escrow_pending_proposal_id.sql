-- Propuesta vinculada al contrato desplegado antes del fondeo (reanudar wizard sin asignar trabajador)
ALTER TABLE public.arcusx_tasks
  ADD COLUMN IF NOT EXISTS escrow_pending_proposal_id bigint REFERENCES public.arcusx_applications (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.arcusx_tasks.escrow_pending_proposal_id IS
  'Propuesta del trabajador asociada al escrow desplegado; se limpia al fondear o reiniciar';

-- Disputas resueltas antes del fix admin: marcar escrow pendiente de firma post-disputa
UPDATE public.arcusx_tasks t
SET escrow_status = 'pending_dispute_resolution'
FROM public.arcusx_disputes d
WHERE d.task_id = t.id
  AND d.status = 'resolved'
  AND t.escrow_id IS NOT NULL
  AND COALESCE(t.escrow_status, '') IN ('active', '');

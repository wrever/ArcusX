-- Ratings para acuerdos (links de pago / deals) además de tareas
ALTER TABLE public.arcusx_ratings
  ALTER COLUMN task_id DROP NOT NULL;

ALTER TABLE public.arcusx_ratings
  ADD COLUMN IF NOT EXISTS agreement_id uuid REFERENCES public.arcusx_agreements (id) ON DELETE CASCADE;

ALTER TABLE public.arcusx_ratings
  DROP CONSTRAINT IF EXISTS arcusx_ratings_unique;

ALTER TABLE public.arcusx_ratings
  ADD CONSTRAINT arcusx_ratings_task_or_deal_chk CHECK (
    (task_id IS NOT NULL AND agreement_id IS NULL)
    OR (task_id IS NULL AND agreement_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_ratings_task_unique
  ON public.arcusx_ratings (task_id, rater_id, rated_id)
  WHERE task_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS arcusx_ratings_agreement_unique
  ON public.arcusx_ratings (agreement_id, rater_id, rated_id)
  WHERE agreement_id IS NOT NULL;

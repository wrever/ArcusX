-- Seguridad escrow nativo — RLS estricto, membresía tareas, auditoría, idempotencia
-- Backend único: Supabase (sin PHP en flujo nativo)

-- Membresía tarea ↔ usuario Supabase (fuente de verdad para auth Edge)
CREATE TABLE IF NOT EXISTS public.arcusx_task_members (
  task_id bigint NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('client', 'freelancer', 'admin')),
  wallet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS arcusx_task_members_user_idx
  ON public.arcusx_task_members (user_id);

COMMENT ON TABLE public.arcusx_task_members IS
  'Quién puede actuar sobre escrow de una tarea; validado en Edge antes de mutar.';

-- Auditoría (sin secretos ni XDR completos)
CREATE TABLE IF NOT EXISTS public.arcusx_escrow_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id bigint,
  escrow_public_key text,
  actor_user_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arcusx_escrow_audit_log_task_idx
  ON public.arcusx_escrow_audit_log (task_id, created_at DESC);

-- Idempotencia release (anti doble pago)
CREATE TABLE IF NOT EXISTS public.arcusx_escrow_idempotency (
  idempotency_key text NOT NULL,
  task_id bigint NOT NULL,
  release_tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idempotency_key, task_id)
);

-- Columnas adicionales escrow
ALTER TABLE public.arcusx_escrows
  ADD COLUMN IF NOT EXISTS setup_tx_hash text;

-- RLS task_members: usuario solo ve sus filas
ALTER TABLE public.arcusx_task_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY arcusx_task_members_select_own
  ON public.arcusx_task_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.arcusx_task_members FROM authenticated, anon;

-- RLS escrows: lectura solo si es miembro de la tarea
DROP POLICY IF EXISTS arcusx_escrows_select_participant ON public.arcusx_escrows;

CREATE POLICY arcusx_escrows_select_task_member
  ON public.arcusx_escrows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.arcusx_task_members m
      WHERE m.task_id = arcusx_escrows.task_id
        AND m.user_id = auth.uid()
    )
  );

-- Milestones: lectura vía escrow de tarea propia
CREATE POLICY arcusx_milestones_select_task_member
  ON public.arcusx_escrow_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.arcusx_escrows e
      JOIN public.arcusx_task_members m ON m.task_id = e.task_id
      WHERE e.id = arcusx_escrow_milestones.escrow_id
        AND m.user_id = auth.uid()
    )
  );

-- Audit e idempotency: solo service_role (Edge)
ALTER TABLE public.arcusx_escrow_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcusx_escrow_idempotency ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.arcusx_escrow_audit_log FROM authenticated, anon;
REVOKE ALL ON public.arcusx_escrow_idempotency FROM authenticated, anon;

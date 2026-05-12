-- Espejo mínimo de tasks (MySQL) + RPCs para stats de la landing.
-- Aplicado en proyecto Supabase vía MCP; re-ejecutar tras export fresco desde MySQL si producción diverge del dump sembrado.
-- Instaward: no sustituye backend operativo ni auth PHP.

CREATE TABLE IF NOT EXISTS public.arcusx_tasks_landing_mirror (
  mysql_task_id bigint PRIMARY KEY,
  status text NOT NULL,
  accepted_applicant_id bigint,
  price numeric(18, 8) NOT NULL,
  escrow_status text
);

COMMENT ON TABLE public.arcusx_tasks_landing_mirror IS 'Réplica mínima de tasks (MySQL) para RPCs de landing.';

TRUNCATE public.arcusx_tasks_landing_mirror;

INSERT INTO public.arcusx_tasks_landing_mirror (mysql_task_id, status, accepted_applicant_id, price, escrow_status) VALUES
(97, 'completed', 3, 1.00000000, 'completed'),
(98, 'open', NULL, 15.00000000, NULL),
(99, 'open', NULL, 300.00000000, NULL),
(100, 'completed', 3, 0.20000000, 'completed'),
(101, 'open', NULL, 20.00000000, NULL),
(102, 'assigned', 1, 30.00000000, 'active'),
(103, 'disputed', 1, 0.50000000, 'active'),
(104, 'completed', 21, 5.00000000, 'completed'),
(105, 'open', NULL, 0.10000000, 'pending_funding'),
(106, 'open', NULL, 5.00000000, NULL),
(107, 'completed', 4, 2.00000000, 'completed'),
(108, 'disputed', 21, 1.00000000, 'active'),
(110, 'open', NULL, 2000.00000000, NULL),
(111, 'open', NULL, 500.00000000, NULL);

ALTER TABLE public.arcusx_tasks_landing_mirror ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_landing_open_tasks_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.arcusx_tasks_landing_mirror t
  WHERE t.status = 'open'
    AND (t.accepted_applicant_id IS NULL OR t.accepted_applicant_id = 0);
$$;

CREATE OR REPLACE FUNCTION public.get_landing_completed_volume_usdc()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ROUND(CAST(SUM(t.price) AS numeric))::bigint,
    0::bigint
  )
  FROM public.arcusx_tasks_landing_mirror t
  WHERE t.status = 'completed'
    AND t.escrow_status = 'completed';
$$;

REVOKE ALL ON FUNCTION public.get_landing_open_tasks_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_landing_completed_volume_usdc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_landing_open_tasks_count() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_landing_completed_volume_usdc() TO anon, authenticated, service_role;

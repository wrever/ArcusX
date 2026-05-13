-- Supabase database linter:
-- 0013_rls_disabled_in_public → ENABLE RLS (sin políticas = denegado vía PostgREST; acceso solo vía RPC con owner).
-- 0028/0029 anon_security_definer → REVOKE EXECUTE a anon en RPCs que exigen sesión; landing mirror stats → SECURITY INVOKER + política SELECT.
-- get_landing_oauth_user_count sigue en SECURITY DEFINER (lectura auth.users); puede seguir avisando el linter — alternativa: Edge Function + service_role.

-- ─── Tablas: RLS obligatorio en public ─────────────────────────────────────
ALTER TABLE IF EXISTS public.arcusx_user_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.arcusx_task_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.arcusx_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.arcusx_notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.arcusx_notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Sin políticas para anon/authenticated: PostgREST no expone filas directamente.
-- Las RPC SECURITY DEFINER (owner postgres) siguen pudiendo leer/escribir el cuerpo de la función.

-- ─── Espejo landing: lectura controlada para RPCs INVOKER (stats públicas) ─
-- Antes: RLS activo sin políticas → solo el owner vía DEFINER. Añadimos política de solo lectura
-- acotada a datos ya pensados como públicos (mismo origen que el carrusel de tareas).
DROP POLICY IF EXISTS arcusx_tasks_landing_mirror_select_public ON public.arcusx_tasks_landing_mirror;
CREATE POLICY arcusx_tasks_landing_mirror_select_public
  ON public.arcusx_tasks_landing_mirror
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.get_landing_open_tasks_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
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
SECURITY INVOKER
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

-- Conteo de usuarios OAuth (auth.users): solo seguro con DEFINER; no exponer auth a INVOKER/anon.
CREATE OR REPLACE FUNCTION public.get_landing_oauth_user_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COUNT(*)::bigint FROM auth.users;
$$;

REVOKE ALL ON FUNCTION public.get_landing_oauth_user_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_landing_oauth_user_count() TO anon, authenticated, service_role;

-- ─── RPCs mensajes / notificaciones: solo sesión Supabase, nunca anon ───────
REVOKE ALL ON FUNCTION public.arcusx_upsert_user_link(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arcusx_list_task_messages(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arcusx_send_task_message(bigint, bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arcusx_notifications_inbox(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arcusx_mark_notification_read(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arcusx_dismiss_notification(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.arcusx_upsert_user_link(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arcusx_list_task_messages(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arcusx_send_task_message(bigint, bigint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arcusx_notifications_inbox(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arcusx_mark_notification_read(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arcusx_dismiss_notification(bigint) TO authenticated, service_role;

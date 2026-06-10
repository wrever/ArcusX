-- Landing stats RPCs read from arcusx_tasks (core) instead of stale mirror when populated.

CREATE OR REPLACE FUNCTION public.get_landing_open_tasks_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.arcusx_tasks t
  WHERE t.status = 'open'
    AND (t.accepted_applicant_id IS NULL);
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
  FROM public.arcusx_tasks t
  WHERE t.status = 'completed'
    AND t.escrow_status = 'completed';
$$;

-- Sync arcusx_user_link from imported users (idempotent)
INSERT INTO public.arcusx_user_link (supabase_user_id, mysql_user_id, updated_at)
SELECT u.supabase_user_id, u.id, now()
FROM public.arcusx_users u
WHERE u.supabase_user_id IS NOT NULL
ON CONFLICT (mysql_user_id) DO UPDATE
  SET supabase_user_id = EXCLUDED.supabase_user_id,
      updated_at = now();

REVOKE ALL ON FUNCTION public.get_landing_open_tasks_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_landing_completed_volume_usdc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_landing_open_tasks_count() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_landing_completed_volume_usdc() TO anon, authenticated, service_role;

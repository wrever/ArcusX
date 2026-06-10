-- Landing stats: usuarios OAuth (auth.users), volumen liberado Supabase (tareas + deals).

UPDATE public.arcusx_landing_oauth_user_count_singleton
SET n = (SELECT COUNT(*)::bigint FROM auth.users),
    updated_at = now()
WHERE id = 1;

CREATE OR REPLACE FUNCTION public.get_landing_oauth_user_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT n FROM public.arcusx_landing_oauth_user_count_singleton WHERE id = 1;
$$;

CREATE OR REPLACE FUNCTION public.get_landing_completed_volume_usdc()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ROUND((
    COALESCE((
      SELECT SUM(
        CASE
          WHEN t.escrow_amount IS NOT NULL AND t.escrow_amount::numeric > 0
            THEN t.escrow_amount::numeric
          ELSE t.price::numeric
        END
      )
      FROM public.arcusx_tasks t
      WHERE t.escrow_id IS NOT NULL
        AND t.escrow_status IS DISTINCT FROM 'refunded'
        AND NOT (t.status = 'cancelled' AND COALESCE(t.escrow_status, '') NOT IN ('resolved', 'completed'))
        AND (
          t.escrow_release_tx_hash IS NOT NULL
          OR (t.status = 'completed' AND t.escrow_status = 'completed')
        )
    ), 0)
    +
    COALESCE((
      SELECT SUM(
        CASE
          WHEN a.client_total IS NOT NULL AND a.client_total::numeric > 0
            THEN a.client_total::numeric
          ELSE a.amount_usdc::numeric
        END
      )
      FROM public.arcusx_agreements a
      WHERE a.status = 'completed'
        AND COALESCE(a.escrow_status, '') IS DISTINCT FROM 'refunded'
        AND a.escrow_release_tx_hash IS NOT NULL
    ), 0)
  ))::bigint, 0::bigint);
$$;

REVOKE ALL ON FUNCTION public.get_landing_oauth_user_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_landing_completed_volume_usdc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_landing_oauth_user_count() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_landing_completed_volume_usdc() TO anon, authenticated, service_role;

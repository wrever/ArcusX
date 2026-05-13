-- OAuth user count for landing: quitar SECURITY DEFINER en la RPC pública (linter 0028/0029).
-- Caché de una fila + trigger en auth.users; get_landing_oauth_user_count() como SECURITY INVOKER.

CREATE TABLE IF NOT EXISTS public.arcusx_landing_oauth_user_count_singleton (
  id int PRIMARY KEY CHECK (id = 1),
  n bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.arcusx_landing_oauth_user_count_singleton (id, n)
VALUES (1, (SELECT COUNT(*)::bigint FROM auth.users))
ON CONFLICT (id) DO UPDATE SET n = EXCLUDED.n, updated_at = now();

ALTER TABLE public.arcusx_landing_oauth_user_count_singleton ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arcusx_landing_oauth_count_read ON public.arcusx_landing_oauth_user_count_singleton;
CREATE POLICY arcusx_landing_oauth_count_read
  ON public.arcusx_landing_oauth_user_count_singleton
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.get_landing_oauth_user_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT n FROM public.arcusx_landing_oauth_user_count_singleton WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.get_landing_oauth_user_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_landing_oauth_user_count() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._refresh_arcusx_landing_oauth_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.arcusx_landing_oauth_user_count_singleton
  SET n = (SELECT COUNT(*)::bigint FROM auth.users),
      updated_at = now()
  WHERE id = 1;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._refresh_arcusx_landing_oauth_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._refresh_arcusx_landing_oauth_count() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public._refresh_arcusx_landing_oauth_count() TO postgres, service_role;

DROP TRIGGER IF EXISTS arcusx_refresh_landing_oauth_count ON auth.users;
CREATE TRIGGER arcusx_refresh_landing_oauth_count
  AFTER INSERT OR DELETE OR UPDATE OF email, encrypted_password ON auth.users
  FOR EACH STATEMENT
  EXECUTE FUNCTION public._refresh_arcusx_landing_oauth_count();

-- Tras import MySQL → Postgres los IDs quedan fijos pero las secuencias identity pueden quedar
-- desfasadas; OAuth signup falla con arcusx_users_pkey. Sincroniza MAX(id) en tablas arcusx_*.

CREATE OR REPLACE FUNCTION public.arcusx_sync_identity_sequences()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  seq_name text;
  max_id bigint;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname ~ '^arcusx_'
      AND a.attname = 'id'
      AND a.attnum > 0
      AND NOT a.attisdropped
  LOOP
    seq_name := pg_get_serial_sequence(format('public.%I', r.table_name), 'id');
    IF seq_name IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM public.%I', r.table_name) INTO max_id;
    EXCEPTION
      WHEN undefined_column THEN
        CONTINUE;
    END;

    IF max_id > 0 THEN
      PERFORM setval(seq_name, max_id, true);
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.arcusx_sync_identity_sequences() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arcusx_sync_identity_sequences() TO service_role;

SELECT public.arcusx_sync_identity_sequences();

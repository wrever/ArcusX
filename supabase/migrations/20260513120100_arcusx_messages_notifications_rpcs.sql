-- RPCs mensajes + notificaciones (SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.arcusx_upsert_user_link(p_mysql_user_id bigint)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  INSERT INTO public.arcusx_user_link (supabase_user_id, mysql_user_id)
  VALUES (auth.uid(), p_mysql_user_id)
  ON CONFLICT (supabase_user_id) DO UPDATE
  SET mysql_user_id = EXCLUDED.mysql_user_id, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.arcusx_list_task_messages(p_task_id bigint)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT mysql_user_id FROM public.arcusx_user_link WHERE supabase_user_id = auth.uid()
  )
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'task_id', m.task_id,
          'sender_id', m.sender_mysql_id,
          'receiver_id', m.receiver_mysql_id,
          'message', m.body,
          'is_read', m.is_read,
          'created_at', m.created_at
        ) ORDER BY m.created_at
      )
      FROM public.arcusx_task_messages m
      WHERE m.task_id = p_task_id
        AND EXISTS (
          SELECT 1 FROM me WHERE m.sender_mysql_id = me.mysql_user_id OR m.receiver_mysql_id = me.mysql_user_id
        )
    ),
    '[]'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.arcusx_send_task_message(p_task_id bigint, p_receiver_mysql_id bigint, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s bigint;
  new_id bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT mysql_user_id INTO s FROM public.arcusx_user_link WHERE supabase_user_id = auth.uid();
  IF s IS NULL THEN RAISE EXCEPTION 'link_required'; END IF;
  IF trim(p_body) = '' THEN RAISE EXCEPTION 'empty_body'; END IF;
  IF s = p_receiver_mysql_id THEN RAISE EXCEPTION 'invalid_receiver'; END IF;
  INSERT INTO public.arcusx_task_messages (task_id, sender_mysql_id, receiver_mysql_id, body)
  VALUES (p_task_id, s, p_receiver_mysql_id, trim(p_body))
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('success', true, 'message', 'Mensaje enviado correctamente', 'message_id', new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.arcusx_notifications_inbox(p_page int, p_limit int)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mysql bigint;
  off int;
  lim int;
  total int;
  unread int;
  items jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT mysql_user_id INTO v_mysql FROM public.arcusx_user_link WHERE supabase_user_id = auth.uid();
  IF v_mysql IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'notifications', '[]'::jsonb,
      'unread_count', 0,
      'pagination', jsonb_build_object('page', p_page, 'limit', GREATEST(1, COALESCE(NULLIF(p_limit, 0), 50)), 'total', 0, 'total_pages', 0)
    );
  END IF;
  lim := GREATEST(1, LEAST(COALESCE(NULLIF(p_limit, 0), 50), 100));
  off := GREATEST(0, (GREATEST(1, COALESCE(NULLIF(p_page, 0), 1)) - 1) * lim);

  SELECT COUNT(*)::int INTO total
  FROM public.arcusx_notifications n
  WHERE n.user_id_mysql IS NULL OR n.user_id_mysql = v_mysql;

  SELECT COUNT(*)::int INTO unread
  FROM public.arcusx_notifications n
  WHERE (n.user_id_mysql IS NULL OR n.user_id_mysql = v_mysql)
    AND NOT EXISTS (
      SELECT 1 FROM public.arcusx_notification_reads r
      WHERE r.notification_id = n.id AND r.supabase_user_id = auth.uid()
    );

  SELECT COALESCE(jsonb_agg(x.js ORDER BY x.ct DESC), '[]'::jsonb) INTO items
  FROM (
    SELECT jsonb_build_object(
      'id', n.id,
      'user_id', n.user_id_mysql,
      'title', n.title,
      'message', n.message,
      'type', n.type,
      'created_at', n.created_at,
      'is_global', (n.user_id_mysql IS NULL),
      'is_read', EXISTS (
        SELECT 1 FROM public.arcusx_notification_reads r2
        WHERE r2.notification_id = n.id AND r2.supabase_user_id = auth.uid()
      )
    ) AS js,
    n.created_at AS ct
    FROM public.arcusx_notifications n
    WHERE n.user_id_mysql IS NULL OR n.user_id_mysql = v_mysql
    ORDER BY n.created_at DESC
    LIMIT lim OFFSET off
  ) x;

  RETURN jsonb_build_object(
    'success', true,
    'notifications', items,
    'unread_count', unread,
    'pagination', jsonb_build_object(
      'page', COALESCE(NULLIF(p_page, 0), 1),
      'limit', lim,
      'total', total,
      'total_pages', CASE WHEN lim > 0 THEN ((total + lim - 1) / lim) ELSE 0 END
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.arcusx_mark_notification_read(p_notification_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mysql bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT mysql_user_id INTO v_mysql FROM public.arcusx_user_link WHERE supabase_user_id = auth.uid();
  IF v_mysql IS NULL THEN RAISE EXCEPTION 'link_required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.arcusx_notifications n
    WHERE n.id = p_notification_id
      AND (n.user_id_mysql IS NULL OR n.user_id_mysql = v_mysql)
  ) THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  INSERT INTO public.arcusx_notification_reads (notification_id, supabase_user_id)
  VALUES (p_notification_id, auth.uid())
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true, 'message', 'Marcado correctamente');
END;
$$;

REVOKE ALL ON FUNCTION public.arcusx_upsert_user_link(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arcusx_list_task_messages(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arcusx_send_task_message(bigint, bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arcusx_notifications_inbox(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arcusx_mark_notification_read(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.arcusx_upsert_user_link(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arcusx_list_task_messages(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arcusx_send_task_message(bigint, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arcusx_notifications_inbox(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arcusx_mark_notification_read(bigint) TO authenticated;

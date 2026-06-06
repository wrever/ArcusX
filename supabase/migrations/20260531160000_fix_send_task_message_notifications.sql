-- arcusx_send_task_message (SECURITY INVOKER) insertaba en arcusx_notifications sin política INSERT
-- → "permission denied for table arcusx_notifications" y el mensaje no se guardaba.

CREATE OR REPLACE FUNCTION public.arcusx_internal_task_message_notify(
  p_task_id bigint,
  p_receiver_mysql_id bigint,
  p_sender_mysql_id bigint,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_title text;
  sender_name text;
  preview text;
BEGIN
  SELECT title INTO task_title FROM public.arcusx_tasks WHERE id = p_task_id;
  SELECT username INTO sender_name FROM public.arcusx_users WHERE id = p_sender_mysql_id;
  preview := left(trim(p_body), 120);
  IF length(trim(p_body)) > 120 THEN
    preview := preview || '…';
  END IF;

  INSERT INTO public.arcusx_notifications (user_id_mysql, title, message, type, created_at)
  VALUES (
    p_receiver_mysql_id,
    'Nuevo mensaje',
    coalesce(sender_name, 'Un usuario') || ' te escribió sobre "' || coalesce(task_title, 'tarea') || '": ' || preview,
    'info',
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.arcusx_internal_task_message_notify(bigint, bigint, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arcusx_internal_task_message_notify(bigint, bigint, bigint, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.arcusx_send_task_message(p_task_id bigint, p_receiver_mysql_id bigint, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  s bigint;
  new_id bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT mysql_user_id INTO s FROM public.arcusx_user_link WHERE supabase_user_id = auth.uid();
  IF s IS NULL THEN
    RAISE EXCEPTION 'link_required';
  END IF;
  IF trim(p_body) = '' THEN
    RAISE EXCEPTION 'empty_body';
  END IF;
  IF s = p_receiver_mysql_id THEN
    RAISE EXCEPTION 'invalid_receiver';
  END IF;

  INSERT INTO public.arcusx_task_messages (task_id, sender_mysql_id, receiver_mysql_id, body)
  VALUES (p_task_id, s, p_receiver_mysql_id, trim(p_body))
  RETURNING id INTO new_id;

  BEGIN
    PERFORM public.arcusx_internal_task_message_notify(p_task_id, p_receiver_mysql_id, s, p_body);
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Mensaje enviado correctamente',
    'message_id', new_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.arcusx_send_task_message(bigint, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arcusx_send_task_message(bigint, bigint, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.arcusx_send_task_message(bigint, bigint, text) FROM anon;

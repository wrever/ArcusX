-- La función interna no debe ser invocable desde PostgREST por usuarios.
REVOKE ALL ON FUNCTION public.arcusx_internal_task_message_notify(bigint, bigint, bigint, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arcusx_internal_task_message_notify(bigint, bigint, bigint, text)
  TO postgres, service_role;

-- Envío de mensajes: DEFINER para insertar mensaje + notificación con validación de participante.
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

  IF NOT EXISTS (
    SELECT 1 FROM public.arcusx_user_link ul
    WHERE ul.supabase_user_id = auth.uid()
      AND ul.mysql_user_id IN (
        SELECT t.user_id FROM public.arcusx_tasks t WHERE t.id = p_task_id
        UNION
        SELECT t.accepted_applicant_id FROM public.arcusx_tasks t WHERE t.id = p_task_id
      )
  ) THEN
    RAISE EXCEPTION 'not_participant';
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

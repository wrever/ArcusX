-- Mensajes y notificaciones ArcusX en Postgres (Supabase).
-- Lectura/escritura vía RPC SECURITY DEFINER; tablas sin acceso directo anon/authenticated.
-- Instaward: no modifica PHP de auth/CORS; mensajes/notificaciones en el front vía Supabase cuando está configurado.

CREATE TABLE IF NOT EXISTS public.arcusx_user_link (
  supabase_user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  mysql_user_id bigint NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.arcusx_task_messages (
  id bigserial PRIMARY KEY,
  task_id bigint NOT NULL,
  sender_mysql_id bigint NOT NULL,
  receiver_mysql_id bigint NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arcusx_task_messages_task ON public.arcusx_task_messages (task_id);
CREATE INDEX IF NOT EXISTS idx_arcusx_task_messages_participants ON public.arcusx_task_messages (task_id, sender_mysql_id, receiver_mysql_id);

CREATE TABLE IF NOT EXISTS public.arcusx_notifications (
  id bigserial PRIMARY KEY,
  user_id_mysql bigint,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.arcusx_notification_reads (
  notification_id bigint NOT NULL REFERENCES public.arcusx_notifications (id) ON DELETE CASCADE,
  supabase_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, supabase_user_id)
);

TRUNCATE public.arcusx_notification_reads, public.arcusx_notifications, public.arcusx_task_messages, public.arcusx_user_link RESTART IDENTITY CASCADE;

INSERT INTO public.arcusx_task_messages (id, task_id, sender_mysql_id, receiver_mysql_id, body, is_read, created_at)
VALUES
(15, 103, 63, 1, 'how''s it going?', false, '2026-03-20 18:33:25+00'),
(16, 103, 1, 63, 'Hello', false, '2026-03-20 18:33:52+00'),
(19, 103, 1, 63, 'test', false, '2026-05-06 23:14:38+00'),
(20, 103, 1, 63, 'tets', false, '2026-05-06 23:14:42+00'),
(21, 103, 1, 63, 'test', false, '2026-05-06 23:14:47+00'),
(22, 103, 1, 63, 'tes', false, '2026-05-06 23:15:20+00'),
(23, 103, 1, 63, 'sss', false, '2026-05-06 23:21:34+00');

SELECT setval(
  pg_get_serial_sequence('public.arcusx_task_messages', 'id'),
  COALESCE((SELECT MAX(id) FROM public.arcusx_task_messages), 1)
);

INSERT INTO public.arcusx_notifications (id, user_id_mysql, title, message, type, created_at)
VALUES
(1, NULL, 'mantenimiento', 'programado', 'info', '2025-11-21 10:42:04+00'),
(2, NULL, 'test', 'test', 'info', '2025-11-21 10:42:27+00'),
(3, NULL, 'sdsd', 'sds', 'info', '2025-11-21 10:50:32+00'),
(4, NULL, 'test', 'test', 'info', '2025-11-21 10:54:50+00');

SELECT setval(
  pg_get_serial_sequence('public.arcusx_notifications', 'id'),
  COALESCE((SELECT MAX(id) FROM public.arcusx_notifications), 1)
);

REVOKE ALL ON TABLE public.arcusx_user_link FROM PUBLIC;
REVOKE ALL ON TABLE public.arcusx_task_messages FROM PUBLIC;
REVOKE ALL ON TABLE public.arcusx_notifications FROM PUBLIC;
REVOKE ALL ON TABLE public.arcusx_notification_reads FROM PUBLIC;

GRANT ALL ON TABLE public.arcusx_user_link TO postgres;
GRANT ALL ON TABLE public.arcusx_task_messages TO postgres;
GRANT ALL ON TABLE public.arcusx_notifications TO postgres;
GRANT ALL ON TABLE public.arcusx_notification_reads TO postgres;

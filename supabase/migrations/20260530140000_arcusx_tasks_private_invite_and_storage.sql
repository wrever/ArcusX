ALTER TABLE public.arcusx_tasks
  ADD COLUMN IF NOT EXISTS is_private_invite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invited_user_id bigint REFERENCES public.arcusx_users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_arcusx_tasks_private_invite
  ON public.arcusx_tasks (invited_user_id)
  WHERE is_private_invite = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-files', 'task-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.arcusx_user_portfolio
  ADD COLUMN IF NOT EXISTS project_url text,
  ADD COLUMN IF NOT EXISTS category varchar(50);

ALTER TABLE public.arcusx_user_portfolio DROP COLUMN IF EXISTS url;

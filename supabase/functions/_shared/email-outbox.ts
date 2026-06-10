import type { SupabaseClient } from '@supabase/supabase-js';
import {
  notificationEmailHtml,
  notificationEmailPlain,
} from './email-templates.ts';
import { emailConfigured } from './email-send.ts';

/** Encola email si el usuario tiene email y notificaciones activas. */
export async function enqueueNotificationEmail(
  supabase: SupabaseClient,
  userIdMysql: number,
  title: string,
  message: string,
  notificationId: number | null,
): Promise<void> {
  if (!emailConfigured()) return;

  const { data: user } = await supabase
    .from('arcusx_users')
    .select('email, email_notifications_enabled')
    .eq('id', userIdMysql)
    .maybeSingle();

  if (!user?.email || user.email_notifications_enabled === false) return;

  const to = String(user.email).trim().toLowerCase();
  if (!to.includes('@')) return;

  const subject = `[ArcusX] ${title.trim().slice(0, 120)}`;
  const emailOpts = {
    title: title.trim(),
    message: message.trim(),
  };
  const bodyText = notificationEmailPlain(emailOpts);
  const bodyHtml = notificationEmailHtml(emailOpts);

  const { error } = await supabase.from('arcusx_email_outbox').insert({
    user_id_mysql: userIdMysql,
    to_email: to,
    subject,
    body_text: bodyText,
    body_html: bodyHtml,
    template_key: 'notification',
    notification_id: notificationId,
    status: 'pending',
  });

  if (error) console.error('[enqueueNotificationEmail]', error.message);
}

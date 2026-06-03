import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueNotificationEmail } from './email-outbox.ts';

export type ArcusxNotificationType = 'info' | 'warning' | 'success' | 'error';

/** Inserta notificación in-app (service role). user_id_mysql null = broadcast. */
export async function insertArcusxNotification(
  supabase: SupabaseClient,
  opts: {
    user_id_mysql: number | null;
    title: string;
    message: string;
    type?: ArcusxNotificationType;
    /** Correo solo en eventos de alto valor (p. ej. pago liberado). Default: false. */
    email?: boolean;
  },
): Promise<number | null> {
  const { data, error } = await supabase
    .from('arcusx_notifications')
    .insert({
      user_id_mysql: opts.user_id_mysql,
      title: opts.title.trim(),
      message: opts.message.trim(),
      type: opts.type ?? 'info',
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[insertArcusxNotification]', error.message);
    return null;
  }
  const notifId = data?.id != null ? Number(data.id) : null;
  const sendEmail = opts.email === true && notifId != null && opts.user_id_mysql != null;
  if (sendEmail) {
    await enqueueNotificationEmail(
      supabase,
      opts.user_id_mysql!,
      opts.title,
      opts.message,
      notifId!,
    );
    triggerEmailWorkerAsync();
  }
  return notifId;
}

/** Notifica a varios usuarios (in-app + email si aplica). */
export async function notifyUsers(
  supabase: SupabaseClient,
  userIds: Iterable<number>,
  opts: {
    title: string;
    message: string;
    type?: ArcusxNotificationType;
    email?: boolean;
  },
): Promise<void> {
  const seen = new Set<number>();
  for (const raw of userIds) {
    const uid = Math.floor(Number(raw));
    if (!Number.isFinite(uid) || uid <= 0 || seen.has(uid)) continue;
    seen.add(uid);
    await insertArcusxNotification(supabase, {
      user_id_mysql: uid,
      title: opts.title,
      message: opts.message,
      type: opts.type,
      email: opts.email,
    });
  }
}

/** Mensaje de email/in-app cuando el trabajador recibe el pago. */
export function formatFundsReleasedMessage(
  contextLabel: string,
  rating?: number | null,
  review?: string | null,
): string {
  let msg =
    `Ya liberaron tus fondos en ${contextLabel}. Revisa tu wallet USDC (Freighter).`;
  const r = Math.floor(Number(rating));
  if (r >= 1 && r <= 5) {
    const stars = '★'.repeat(r) + '☆'.repeat(5 - r);
    msg += ` Valoración del cliente: ${stars} (${r}/5).`;
    const note = review?.trim();
    if (note) msg += ` Comentario: «${note.slice(0, 160)}»`;
  }
  return msg;
}

/** Resuelve user_id por wallet G... (cobro o perfil). */
export async function userIdForStellarWallet(
  supabase: SupabaseClient,
  wallet: string,
): Promise<number | null> {
  const w = wallet.trim();
  if (!w.startsWith('G') || w.length !== 56) return null;
  const { data } = await supabase
    .from('arcusx_users')
    .select('id')
    .or(`wallet_address.eq.${w},private_payout_wallet.eq.${w}`)
    .maybeSingle();
  const id = Number(data?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Procesa la cola sin bloquear la respuesta HTTP del handler. */
function triggerEmailWorkerAsync(): void {
  const base = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('ARCUSX_SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return;
  const cronSecret = Deno.env.get('ARCUSX_CRON_SECRET')?.trim();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    apikey: key,
  };
  if (cronSecret) headers['x-cron-secret'] = cronSecret;
  const p = fetch(`${base}/functions/v1/arcusx-email-worker`, {
    method: 'POST',
    headers,
  });
  // @ts-ignore Edge runtime
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    EdgeRuntime.waitUntil(p);
  }
}

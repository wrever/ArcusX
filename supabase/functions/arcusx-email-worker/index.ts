import { handleOptions, jsonError, jsonSuccess } from '../_shared/arcusx-cors.ts';
import { emailConfigured, getEmailProvider, sendArcusxEmail } from '../_shared/email-send.ts';
import { supabaseService } from '../_shared/referral-db.ts';

const MAX_BATCH = 25;
const MAX_ATTEMPTS = 3;

function assertCaller(req: Request): boolean {
  const cronSecret = Deno.env.get('ARCUSX_CRON_SECRET')?.trim() ||
    Deno.env.get('CRON_SECRET')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('ARCUSX_SUPABASE_SERVICE_ROLE_KEY');
  const auth = req.headers.get('Authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (serviceKey && bearer === serviceKey) return true;
  if (!cronSecret) return true;
  return bearer === cronSecret || req.headers.get('x-cron-secret') === cronSecret;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (!assertCaller(req)) {
    return jsonError(req, 'Unauthorized', 401);
  }

  const provider = getEmailProvider();
  if (!emailConfigured() || !provider) {
    return jsonSuccess(req, {
      message:
        'Email no configurado. Agregá RESEND_API_KEY (recomendado) o SMTP_* en Edge Secrets.',
      processed: 0,
      provider: null,
    });
  }

  const supabase = supabaseService();
  const { data: rows, error } = await supabase
    .from('arcusx_email_outbox')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH);

  if (error) return jsonError(req, error.message, 500);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const id = row.id as number;
    try {
      await sendArcusxEmail({
        to: String(row.to_email),
        subject: String(row.subject),
        text: String(row.body_text),
        html: row.body_html ? String(row.body_html) : undefined,
      });
      await supabase.from('arcusx_email_outbox').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        error_message: null,
      }).eq('id', id);
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'send failed';
      await supabase.from('arcusx_email_outbox').update({
        status: 'failed',
        attempts: (row.attempts as number) + 1,
        error_message: msg.slice(0, 500),
      }).eq('id', id);
      failed++;
    }
  }

  return jsonSuccess(req, {
    message: 'Email worker completado',
    provider,
    pending_found: rows?.length ?? 0,
    sent,
    failed,
  });
});

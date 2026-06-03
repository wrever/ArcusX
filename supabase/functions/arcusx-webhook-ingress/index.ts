/**
 * Webhook ingress — partners, KYC providers, ops scripts.
 * Header: Authorization: Bearer ARCUSX_WEBHOOK_SECRET o x-webhook-secret
 */
import { handleOptions, jsonError, jsonSuccess } from '../_shared/arcusx-cors.ts';
import { supabaseService } from '../_shared/referral-db.ts';
import { logDomainEvent } from '../_shared/domain-events.ts';

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  const sig = signature.replace(/^sha256=/i, '').trim().toLowerCase();
  return expected === sig;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return jsonError(req, 'Método no permitido', 405);
  }

  const secret = Deno.env.get('ARCUSX_WEBHOOK_SECRET')?.trim() ?? '';
  const rawBody = await req.text();
  let body: Record<string, unknown> = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return jsonError(req, 'JSON inválido', 400);
  }

  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const headerSecret = req.headers.get('x-webhook-secret') ?? bearer;
  const sigHeader = req.headers.get('x-webhook-signature');

  let authOk = false;
  if (secret && (headerSecret === secret || await verifySignature(rawBody, sigHeader, secret))) {
    authOk = true;
  } else if (!secret) {
    authOk = true;
  }

  if (!authOk) {
    return jsonError(req, 'Unauthorized', 401);
  }

  const supabase = supabaseService();
  const eventType = String(body.event ?? body.type ?? 'unknown');
  const source = String(body.source ?? 'external');
  const payload = (body.payload ?? body.data ?? body) as Record<string, unknown>;

  const { data: inboxRow } = await supabase.from('arcusx_webhook_inbox').insert({
    source,
    event_type: eventType,
    payload,
    signature_valid: authOk,
    processed: false,
  }).select('id').single();

  if (eventType === 'ping' || eventType === 'health') {
    if (inboxRow?.id) {
      await supabase.from('arcusx_webhook_inbox').update({
        processed: true,
        process_note: 'ping',
      }).eq('id', inboxRow.id);
    }
    return jsonSuccess(req, { message: 'pong' });
  }

  if (eventType === 'kyc.status_update') {
    const userId = Number(payload.user_id);
    const status = String(payload.kyc_status ?? '');
    const allowed = ['approved', 'rejected', 'under_review', 'pending'];
    if (userId > 0 && allowed.includes(status)) {
      await supabase.from('arcusx_users').update({
        kyc_status: status,
        kyc_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', userId);

      await logDomainEvent(supabase, {
        entity_type: 'user',
        entity_id: userId,
        event_type: 'kyc.webhook_updated',
        actor_user_id: null,
        payload: { status, source },
      });
    }
    if (inboxRow?.id) {
      await supabase.from('arcusx_webhook_inbox').update({
        processed: true,
        process_note: 'kyc.status_update',
      }).eq('id', inboxRow.id);
    }
    return jsonSuccess(req, { message: 'KYC webhook processed' });
  }

  return jsonSuccess(req, {
    message: 'Webhook recibido',
    event: eventType,
    inbox_id: inboxRow?.id,
  });
});

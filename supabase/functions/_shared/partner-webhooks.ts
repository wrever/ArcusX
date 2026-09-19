import type { SupabaseClient } from '@supabase/supabase-js';

export type WebhookEventType =
  | 'task.created'
  | 'escrow.deployed'
  | 'escrow.funded'
  | 'task.work_started'
  | 'task.completed'
  | 'deal.created'
  | 'deal.funded'
  | 'deal.released'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'job.created'
  | 'subjob.created'
  | 'subjob.funded'
  | 'subjob.released';

async function sha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function deliverOnce(
  url: string,
  secret: string | null,
  eventType: string,
  payload: Record<string, unknown>,
  deliveryId: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const body = JSON.stringify({
    id: deliveryId,
    type: eventType,
    created_at: new Date().toISOString(),
    data: payload,
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ArcusX-Webhooks/0.4',
    'X-ArcusX-Event': eventType,
  };
  if (secret) {
    headers['X-ArcusX-Signature'] = `sha256=${await sha256Hex(secret, body)}`;
  }

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: text.slice(0, 500) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Encola y entrega webhook al partner (fire-and-forget con reintentos inline). */
export async function emitPartnerWebhook(
  supabase: SupabaseClient,
  partnerId: string | null | undefined,
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!partnerId) return;

  const { data: partner } = await supabase
    .from('arcusx_partners')
    .select('id, webhook_url, webhook_secret, webhook_enabled, status')
    .eq('id', partnerId)
    .maybeSingle();

  if (!partner?.webhook_url || partner.webhook_enabled === false || partner.status !== 'active') {
    return;
  }

  const { data: row, error } = await supabase
    .from('arcusx_webhook_deliveries')
    .insert({
      partner_id: partnerId,
      event_type: eventType,
      payload,
      webhook_url: partner.webhook_url,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !row?.id) {
    console.error('[emitPartnerWebhook] insert failed', error?.message);
    return;
  }

  const deliveryId = String(row.id);
  const url = String(partner.webhook_url);
  const secret = partner.webhook_secret ? String(partner.webhook_secret) : null;

  void (async () => {
    let lastError: string | undefined;
    let responseStatus = 0;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await deliverOnce(url, secret, eventType, payload, deliveryId);
      responseStatus = result.status;
      if (result.ok) {
        await supabase.from('arcusx_webhook_deliveries').update({
          status: 'delivered',
          attempts: attempt,
          response_status: result.status,
          delivered_at: new Date().toISOString(),
        }).eq('id', deliveryId);
        return;
      }
      lastError = result.error;
      await supabase.from('arcusx_webhook_deliveries').update({
        attempts: attempt,
        last_error: lastError,
        response_status: result.status || null,
      }).eq('id', deliveryId);
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
    }
    await supabase.from('arcusx_webhook_deliveries').update({
      status: 'failed',
      last_error: lastError ?? 'delivery failed',
      response_status: responseStatus || null,
    }).eq('id', deliveryId);
  })();
}

export async function listPartnerWebhookDeliveries(
  supabase: SupabaseClient,
  partnerId: string,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  const { data } = await supabase
    .from('arcusx_webhook_deliveries')
    .select('id, event_type, status, attempts, response_status, created_at, delivered_at, payload')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));
  return data ?? [];
}

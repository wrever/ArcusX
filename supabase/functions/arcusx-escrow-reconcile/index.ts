/**
 * Cron / manual: reconcilia estados escrow en BD (tareas con contract_id).
 * Trustless Work no envía webhooks; el cliente confirma vía arcusx-api.
 * Este job detecta inconsistencias y registra en arcusx_escrow_sync_log.
 */
import { handleOptions, jsonSuccess, jsonError } from '../_shared/arcusx-cors.ts';
import { supabaseService } from '../_shared/referral-db.ts';

const STALE_HOURS = 48;

/** Si ARCUSX_CRON_SECRET no está en Edge Secrets, el endpoint es abierto (solo smoke/manual). */
function assertCronSecret(req: Request): boolean {
  const secret = Deno.env.get('ARCUSX_CRON_SECRET')?.trim();
  if (!secret) return true;
  const h = req.headers.get('Authorization') ?? '';
  return h === `Bearer ${secret}` || req.headers.get('x-cron-secret') === secret;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (!assertCronSecret(req)) {
    return jsonError(req, 'Unauthorized', 401);
  }

  const supabase = supabaseService();
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from('arcusx_tasks')
    .select('id, escrow_id, escrow_status, status, escrow_created_at, created_at')
    .not('escrow_id', 'is', null)
    .in('escrow_status', ['pending', 'created', 'funding'])
    .or(`escrow_created_at.lt.${cutoff},and(escrow_created_at.is.null,created_at.lt.${cutoff})`)
    .limit(100);

  if (error) return jsonError(req, error.message, 500);

  let logged = 0;
  for (const row of rows ?? []) {
    const contractId = String(row.escrow_id);
    const prev = String(row.escrow_status ?? '');
    await supabase.from('arcusx_escrow_sync_log').insert({
      task_id: row.id,
      contract_id: contractId,
      previous_status: prev,
      new_status: prev,
      source: 'reconcile_stale',
      payload: { note: 'escrow sin confirmar >48h', task_status: row.status },
    });
    logged++;
  }

  const { data: deals } = await supabase
    .from('arcusx_agreements')
    .select('id, escrow_contract_id, status')
    .eq('status', 'accepted')
    .not('escrow_contract_id', 'is', null)
    .is('funded_at', null)
    .limit(50);

  for (const d of deals ?? []) {
    await supabase.from('arcusx_escrow_sync_log').insert({
      agreement_id: d.id,
      contract_id: String(d.escrow_contract_id),
      previous_status: String(d.status),
      new_status: String(d.status),
      source: 'reconcile_deal_pending_fund',
      payload: { note: 'deal accepted sin funded_at' },
    });
    logged++;
  }

  return jsonSuccess(req, {
    message: 'Reconcile completado',
    stale_tasks: rows?.length ?? 0,
    deals_checked: deals?.length ?? 0,
    log_entries: logged,
  });
});

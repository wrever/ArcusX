import type { SupabaseClient } from '@supabase/supabase-js';

const TERMINAL_SUBJOB = new Set(['released', 'cancelled']);

export async function syncSubjobEscrowFromTask(
  supabase: SupabaseClient,
  subjobId: string,
  taskId: number,
): Promise<{ escrow_contract_id: string | null; escrow_status: string | null }> {
  const { data: task } = await supabase
    .from('arcusx_tasks')
    .select('escrow_id, escrow_status, escrow_fund_tx_hash, status')
    .eq('id', taskId)
    .maybeSingle();

  const contractId = String(task?.escrow_id ?? '').trim() || null;
  const escrowStatus = task?.escrow_status ? String(task.escrow_status) : null;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (contractId) patch.escrow_contract_id = contractId;

  if (escrowStatus === 'active' || task?.escrow_fund_tx_hash) {
    patch.status = 'funded';
  } else if (contractId && !task?.escrow_fund_tx_hash) {
    patch.status = 'task_created';
  }

  if (Object.keys(patch).length > 1) {
    await supabase.from('arcusx_subjobs').update(patch).eq('id', subjobId);
  }

  return { escrow_contract_id: contractId, escrow_status: escrowStatus };
}

export async function maybeCompleteJob(
  supabase: SupabaseClient,
  jobId: string,
): Promise<boolean> {
  const { data: subjobs } = await supabase
    .from('arcusx_subjobs')
    .select('status')
    .eq('job_id', jobId);

  if (!subjobs?.length) return false;

  const allTerminal = subjobs.every((s: { status: string }) => TERMINAL_SUBJOB.has(String(s.status)));
  if (!allTerminal) return false;

  const now = new Date().toISOString();
  await supabase.from('arcusx_jobs').update({
    status: 'completed',
    updated_at: now,
  }).eq('id', jobId);

  return true;
}

export async function loadTaskEscrowSnapshot(
  supabase: SupabaseClient,
  taskId: number,
): Promise<Record<string, unknown> | null> {
  const { data: task } = await supabase
    .from('arcusx_tasks')
    .select(`
      id, status, escrow_id, escrow_status, escrow_amount,
      escrow_fund_tx_hash, escrow_release_tx_hash, escrow_deploy_tx_hash,
      worker_started_at, worker_accepted_completion, client_accepted_completion
    `)
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return null;
  return {
    task_id: task.id,
    task_status: task.status,
    escrow_id: task.escrow_id,
    escrow_status: task.escrow_status,
    escrow_amount: task.escrow_amount,
    escrow_fund_tx_hash: task.escrow_fund_tx_hash,
    escrow_release_tx_hash: task.escrow_release_tx_hash,
    escrow_deploy_tx_hash: task.escrow_deploy_tx_hash,
    worker_started_at: task.worker_started_at,
    worker_accepted_completion: task.worker_accepted_completion,
    client_accepted_completion: task.client_accepted_completion,
  };
}

export function isReleasedStatus(status: string): boolean {
  return status === 'released';
}

export const COMPLETION_CONDITIONS = new Set([
  'manual_approve',
  'api_callback',
  'webhook_attestation',
  'verifier_agent',
  'certix_approved',
]);

export const CALLBACK_RELEASE_CONDITIONS = new Set([
  'api_callback',
  'webhook_attestation',
  'verifier_agent',
]);

/** Tras select_proposal / asignación manual, enlaza arcusx_subjobs ↔ propuesta aceptada. */
export async function syncSubjobFromTaskAssignment(
  supabase: SupabaseClient,
  taskId: number,
  proposalId: number,
  executorUserId: number,
  executorWallet: string,
): Promise<{ subjob_id: string | null; synced: boolean }> {
  const { data: subjob } = await supabase
    .from('arcusx_subjobs')
    .select('id, proposal_id, executor_user_id, status')
    .eq('task_id', taskId)
    .maybeSingle();

  if (!subjob?.id) return { subjob_id: null, synced: false };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    proposal_id: proposalId,
    executor_user_id: executorUserId,
    executor_wallet: executorWallet,
    updated_at: now,
  };
  if (String(subjob.status) === 'pending') {
    patch.status = 'task_created';
  }

  await supabase.from('arcusx_subjobs').update(patch).eq('id', subjob.id);

  return { subjob_id: String(subjob.id), synced: true };
}

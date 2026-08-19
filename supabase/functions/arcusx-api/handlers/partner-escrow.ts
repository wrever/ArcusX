/**
 * Partner escrow rail — API key only (no ArcusX user JWT).
 * Input: client_wallet + worker_wallet + amount_usdc (+ optional external_id/title).
 * ArcusX applies platform fee server-side; on-chain engine stays internal.
 */
import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { quoteBilateralFromNominal } from '../../_shared/bilateral-fee.ts';
import { emitPartnerWebhook } from '../../_shared/partner-webhooks.ts';
import { normalizePlatformFeeRate } from '../../_shared/platform-fee.ts';
import {
  adminWallet,
  assertStellarEscrowConfig,
  isValidStellarG,
  platformWallet,
  usdcIssuerForNetwork,
} from '../../_shared/stellar-network.ts';
import {
  twApproveMilestone,
  twDeploySingleRelease,
  twFundSingleRelease,
  twReleaseSingleRelease,
  twSendTransaction,
} from '../../_shared/trustless-work-api.ts';
import { escrowPrepareFailed, escrowProviderUnavailable } from '../../_shared/escrow-provider-errors.ts';
import { collectSignedXdrs, resolveEscrowTxHash, submitSignedXdrSequence } from '../../_shared/escrow-signed-submit.ts';
import { toTrustlessWorkPlatformFee } from '../../_shared/tw-fee.ts';
import type { ApiContext } from './types.ts';
import { requirePartnerKey } from './require.ts';

async function loadPlatformFee(supabase: ApiContext['supabase']): Promise<number> {
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  return normalizePlatformFeeRate(data?.config_value);
}

function serializeRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    external_id: row.external_id ?? null,
    engagement_id: row.engagement_id,
    title: row.title ?? null,
    description: row.description ?? null,
    client_wallet: row.client_wallet,
    worker_wallet: row.worker_wallet,
    amount_usdc: Number(row.amount_usdc),
    fund_amount: Number(row.fund_amount),
    platform_fee: Number(row.platform_fee),
    contract_id: row.contract_id ?? null,
    status: row.status,
    deploy_tx_hash: row.deploy_tx_hash ?? null,
    fund_tx_hash: row.fund_tx_hash ?? null,
    release_tx_hash: row.release_tx_hash ?? null,
    stellar_network: row.stellar_network,
    quote: row.quote ?? null,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadOwnedEscrow(
  supabase: ApiContext['supabase'],
  partnerId: string,
  escrowId: string,
) {
  const { data, error } = await supabase
    .from('arcusx_partner_escrows')
    .select('*')
    .eq('id', escrowId)
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

/** POST partner_escrow_deploy_prepare */
export async function preparePartnerEscrowDeploy(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);

  try {
    assertStellarEscrowConfig(stellarNetwork);
  } catch {
    return jsonError(req, escrowProviderUnavailable(), 503);
  }

  const clientWallet = String(body.client_wallet ?? body.signer ?? '').trim();
  const workerWallet = String(body.worker_wallet ?? body.service_provider ?? '').trim();
  const amountUsdc = Number(body.amount_usdc ?? body.nominal ?? body.amount);
  const externalId = body.external_id ? String(body.external_id).trim() : null;
  const title = String(body.title ?? 'Partner escrow').trim().slice(0, 200);
  const description = String(body.description ?? 'ArcusX partner escrow').trim().slice(0, 2000);

  if (!isValidStellarG(clientWallet)) return jsonError(req, 'client_wallet inválida', 400);
  if (!isValidStellarG(workerWallet)) return jsonError(req, 'worker_wallet inválida', 400);
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return jsonError(req, 'amount_usdc requerido (> 0)', 400);
  }
  if (clientWallet === workerWallet) {
    return jsonError(req, 'client_wallet y worker_wallet deben ser distintas', 400);
  }

  if (externalId) {
    const { data: existing } = await supabase
      .from('arcusx_partner_escrows')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('external_id', externalId)
      .maybeSingle();
    if (existing && ['released', 'cancelled'].includes(String(existing.status))) {
      return jsonError(req, 'external_id ya cerrado; usa otro id', 409);
    }
    if (existing && existing.contract_id && String(existing.status) !== 'created' && String(existing.status) !== 'deploy_prepared') {
      return jsonSuccess(req, {
        existing: true,
        escrow: serializeRow(existing as Record<string, unknown>),
        step: 'deploy',
        provider: 'arcusx_escrow',
        unsigned_xdr: null,
        note: 'Escrow ya existe para este external_id — continúa con fund/release',
      });
    }
  }

  const platformFee = await loadPlatformFee(supabase);
  const bilateral = quoteBilateralFromNominal(amountUsdc, platformFee);
  const fundAmount = bilateral.fundAmount;
  const twPlatformFee = toTrustlessWorkPlatformFee(platformFee);
  const engagementId = externalId
    ? `arcusx-partner-${partnerId.slice(0, 8)}-${externalId}`.slice(0, 64)
    : `arcusx-partner-${crypto.randomUUID()}`.slice(0, 64);

  let twRes: Awaited<ReturnType<typeof twDeploySingleRelease>>;
  try {
    twRes = await twDeploySingleRelease({
      signer: clientWallet,
      engagementId,
      title,
      description,
      amount: fundAmount,
      platformFee: twPlatformFee,
      roles: {
        approver: clientWallet,
        serviceProvider: workerWallet,
        platformAddress: platformWallet(stellarNetwork),
        releaseSigner: clientWallet,
        disputeResolver: adminWallet(stellarNetwork),
        receiver: workerWallet,
      },
      milestones: [{ description: 'Entrega del trabajo' }],
      trustline: { address: usdcIssuerForNetwork(stellarNetwork), symbol: 'USDC' },
    }, stellarNetwork);
  } catch (e) {
    console.error('[partner-escrow] prepareDeploy', e);
    const raw = e instanceof Error ? e.message : String(e);
    const safe = raw
      .replace(/Trustless\s*Work/gi, 'provider')
      .replace(/\bTW\b/g, 'provider')
      .replace(/trustlesswork\.com/gi, 'escrow-api')
      .slice(0, 160);
    return jsonError(
      req,
      safe ? `${escrowPrepareFailed('deploy')} [${safe}]` : escrowPrepareFailed('deploy'),
      502,
    );
  }

  if (!twRes.unsignedTransaction) {
    console.error('[partner-escrow] prepareDeploy sin XDR', twRes.message);
    return jsonError(req, escrowPrepareFailed('deploy'), 502);
  }

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    partner_id: partnerId,
    external_id: externalId,
    engagement_id: engagementId,
    title,
    description,
    client_wallet: clientWallet,
    worker_wallet: workerWallet,
    amount_usdc: amountUsdc,
    fund_amount: fundAmount,
    platform_fee: platformFee,
    contract_id: twRes.contractId ?? null,
    status: 'deploy_prepared',
    stellar_network: stellarNetwork,
    quote: bilateral,
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    updated_at: now,
  };

  let saved: Record<string, unknown> | null = null;
  if (externalId) {
    const { data: existingRow } = await supabase
      .from('arcusx_partner_escrows')
      .select('id')
      .eq('partner_id', partnerId)
      .eq('external_id', externalId)
      .maybeSingle();
    if (existingRow?.id) {
      const { data: updated, error: upErr } = await supabase
        .from('arcusx_partner_escrows')
        .update(row)
        .eq('id', existingRow.id)
        .select('*')
        .single();
      if (upErr) {
        console.error('[partner-escrow] update', upErr);
        return jsonError(req, 'No se pudo persistir escrow', 500);
      }
      saved = updated as Record<string, unknown>;
    } else {
      const { data: inserted, error: inErr } = await supabase
        .from('arcusx_partner_escrows')
        .insert({ ...row, created_at: now })
        .select('*')
        .single();
      if (inErr) {
        console.error('[partner-escrow] insert', inErr);
        return jsonError(req, 'No se pudo persistir escrow', 500);
      }
      saved = inserted as Record<string, unknown>;
    }
  } else {
    const { data: inserted, error } = await supabase
      .from('arcusx_partner_escrows')
      .insert({ ...row, created_at: now })
      .select('*')
      .single();
    if (error) {
      console.error('[partner-escrow] insert', error);
      return jsonError(req, 'No se pudo persistir escrow', 500);
    }
    saved = inserted as Record<string, unknown>;
  }

  void emitPartnerWebhook(supabase, partnerId, 'partner_escrow.deploy_prepared', {
    escrow_id: saved!.id,
    external_id: externalId,
    fund_amount: fundAmount,
  });

  return jsonSuccess(req, {
    step: 'deploy',
    provider: 'arcusx_escrow',
    unsigned_xdr: twRes.unsignedTransaction,
    contract_id: twRes.contractId ?? null,
    engagement_id: engagementId,
    fund_amount: fundAmount,
    client_total: bilateral.clientTotal,
    worker_net: bilateral.workerNet,
    platform_fee: platformFee,
    quote: bilateral,
    escrow: serializeRow(saved!),
  });
}

/** POST partner_escrow_deploy_confirm */
export async function confirmPartnerEscrowDeploy(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const escrowId = String(body.escrow_id ?? body.id ?? '').trim();
  if (!escrowId) return jsonError(req, 'escrow_id requerido', 400);

  const row = await loadOwnedEscrow(supabase, partnerId, escrowId);
  if (!row) return jsonError(req, 'Escrow no encontrado', 404);

  let contractId = String(body.contract_id ?? row.contract_id ?? '').trim();
  let deployTxHash = String(body.deploy_tx_hash ?? body.transaction_hash ?? '').trim();

  if (body.signed_xdr) {
    const sent = await twSendTransaction(String(body.signed_xdr), stellarNetwork);
    contractId = String(sent.contractId ?? contractId);
    deployTxHash = String(sent.hash ?? deployTxHash);
  }

  if (!contractId || !deployTxHash) {
    return jsonError(req, 'contract_id y deploy_tx_hash (o signed_xdr) requeridos', 400);
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('arcusx_partner_escrows')
    .update({
      contract_id: contractId,
      deploy_tx_hash: deployTxHash,
      status: 'deployed',
      updated_at: now,
    })
    .eq('id', escrowId)
    .eq('partner_id', partnerId)
    .select('*')
    .single();

  if (error || !updated) return jsonError(req, 'No se pudo confirmar deploy', 500);

  void emitPartnerWebhook(supabase, partnerId, 'partner_escrow.deployed', {
    escrow_id: escrowId,
    contract_id: contractId,
    deploy_tx_hash: deployTxHash,
  });

  return jsonSuccess(req, {
    step: 'deploy_confirm',
    escrow: serializeRow(updated as Record<string, unknown>),
  });
}

/** POST partner_escrow_fund_prepare */
export async function preparePartnerEscrowFund(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const escrowId = String(body.escrow_id ?? body.id ?? '').trim();
  const clientWallet = String(body.client_wallet ?? body.signer ?? '').trim();
  if (!escrowId) return jsonError(req, 'escrow_id requerido', 400);
  if (!isValidStellarG(clientWallet)) return jsonError(req, 'client_wallet inválida', 400);

  const row = await loadOwnedEscrow(supabase, partnerId, escrowId);
  if (!row) return jsonError(req, 'Escrow no encontrado', 404);
  if (String(row.client_wallet) !== clientWallet) {
    return jsonError(req, 'client_wallet no coincide con el escrow', 403);
  }
  const contractId = String(row.contract_id ?? '').trim();
  if (!contractId) return jsonError(req, 'Primero confirma el deploy', 400);

  const fundAmount = Number(row.fund_amount);
  let twRes: Awaited<ReturnType<typeof twFundSingleRelease>>;
  try {
    twRes = await twFundSingleRelease({
      contractId,
      signer: clientWallet,
      amount: fundAmount,
    }, stellarNetwork);
  } catch (e) {
    console.error('[partner-escrow] prepareFund', e);
    return jsonError(req, escrowPrepareFailed('fund'), 502);
  }
  if (!twRes.unsignedTransaction) {
    return jsonError(req, escrowPrepareFailed('fund'), 502);
  }

  return jsonSuccess(req, {
    step: 'fund',
    provider: 'arcusx_escrow',
    unsigned_xdr: twRes.unsignedTransaction,
    contract_id: contractId,
    fund_amount: fundAmount,
    escrow_id: escrowId,
  });
}

/** POST partner_escrow_fund_confirm */
export async function confirmPartnerEscrowFund(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const escrowId = String(body.escrow_id ?? body.id ?? '').trim();
  if (!escrowId) return jsonError(req, 'escrow_id requerido', 400);

  const row = await loadOwnedEscrow(supabase, partnerId, escrowId);
  if (!row) return jsonError(req, 'Escrow no encontrado', 404);

  const fundTxHash = await resolveEscrowTxHash(body, stellarNetwork);
  if (!fundTxHash) return jsonError(req, 'fund_tx_hash o signed_xdr requeridos', 400);

  const contractId = String(body.contract_id ?? row.contract_id ?? '').trim();
  const { data: updated, error } = await supabase
    .from('arcusx_partner_escrows')
    .update({
      fund_tx_hash: fundTxHash,
      contract_id: contractId || row.contract_id,
      status: 'funded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId)
    .eq('partner_id', partnerId)
    .select('*')
    .single();

  if (error || !updated) return jsonError(req, 'No se pudo confirmar fund', 500);

  void emitPartnerWebhook(supabase, partnerId, 'partner_escrow.funded', {
    escrow_id: escrowId,
    fund_tx_hash: fundTxHash,
    contract_id: contractId,
  });

  return jsonSuccess(req, {
    step: 'fund_confirm',
    fund_tx_hash: fundTxHash,
    escrow: serializeRow(updated as Record<string, unknown>),
  });
}

/** POST partner_escrow_release_prepare */
export async function preparePartnerEscrowRelease(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const escrowId = String(body.escrow_id ?? body.id ?? '').trim();
  const clientWallet = String(body.client_wallet ?? body.release_signer ?? '').trim();
  if (!escrowId) return jsonError(req, 'escrow_id requerido', 400);
  if (!isValidStellarG(clientWallet)) return jsonError(req, 'client_wallet inválida', 400);

  const row = await loadOwnedEscrow(supabase, partnerId, escrowId);
  if (!row) return jsonError(req, 'Escrow no encontrado', 404);
  if (String(row.client_wallet) !== clientWallet) {
    return jsonError(req, 'client_wallet no coincide con el escrow', 403);
  }
  if (String(row.status) !== 'funded') {
    return jsonError(req, 'Escrow debe estar funded para liberar', 400);
  }
  const contractId = String(row.contract_id ?? '').trim();
  if (!contractId) return jsonError(req, 'Sin contract_id', 400);

  let approveRes: Awaited<ReturnType<typeof twApproveMilestone>>;
  let releaseRes: Awaited<ReturnType<typeof twReleaseSingleRelease>>;
  try {
    approveRes = await twApproveMilestone({
      contractId,
      approver: clientWallet,
      milestoneIndex: '0',
    }, stellarNetwork);
    releaseRes = await twReleaseSingleRelease({
      contractId,
      releaseSigner: clientWallet,
    }, stellarNetwork);
  } catch (e) {
    console.error('[partner-escrow] prepareRelease', e);
    return jsonError(req, escrowPrepareFailed('release'), 502);
  }

  const steps: Array<Record<string, unknown>> = [];
  if (approveRes.unsignedTransaction) {
    steps.push({
      action: 'approve_milestone',
      milestone_index: '0',
      unsigned_xdr: approveRes.unsignedTransaction,
    });
  }
  if (releaseRes.unsignedTransaction) {
    steps.push({
      action: 'release_funds',
      unsigned_xdr: releaseRes.unsignedTransaction,
    });
  }
  if (!steps.length) return jsonError(req, escrowPrepareFailed('release'), 502);

  return jsonSuccess(req, {
    step: 'release',
    provider: 'arcusx_escrow',
    contract_id: contractId,
    escrow_id: escrowId,
    steps,
  });
}

/** POST partner_escrow_release_confirm */
export async function confirmPartnerEscrowRelease(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const escrowId = String(body.escrow_id ?? body.id ?? '').trim();
  if (!escrowId) return jsonError(req, 'escrow_id requerido', 400);

  const row = await loadOwnedEscrow(supabase, partnerId, escrowId);
  if (!row) return jsonError(req, 'Escrow no encontrado', 404);

  let releaseTxHash = String(
    body.release_tx_hash ?? body.transaction_hash ?? body.tx_hash ?? '',
  ).trim() || null;

  const signedList = collectSignedXdrs(body);
  if (signedList.length > 0) {
    const seq = await submitSignedXdrSequence(signedList, stellarNetwork);
    releaseTxHash = seq.lastHash ?? releaseTxHash;
  }
  if (!releaseTxHash) {
    releaseTxHash = await resolveEscrowTxHash(body, stellarNetwork);
  }
  if (!releaseTxHash) return jsonError(req, 'release_tx_hash o signed_xdr requeridos', 400);

  const { data: updated, error } = await supabase
    .from('arcusx_partner_escrows')
    .update({
      release_tx_hash: releaseTxHash,
      status: 'released',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId)
    .eq('partner_id', partnerId)
    .select('*')
    .single();

  if (error || !updated) return jsonError(req, 'No se pudo confirmar release', 500);

  void emitPartnerWebhook(supabase, partnerId, 'partner_escrow.released', {
    escrow_id: escrowId,
    release_tx_hash: releaseTxHash,
  });

  return jsonSuccess(req, {
    step: 'release_confirm',
    release_tx_hash: releaseTxHash,
    escrow: serializeRow(updated as Record<string, unknown>),
  });
}

/** GET partner_escrow_get */
export async function getPartnerEscrow(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const escrowId = String(
    url.searchParams.get('escrow_id') ?? ctx.body.escrow_id ?? ctx.body.id ?? '',
  ).trim();
  if (!escrowId) return jsonError(req, 'escrow_id requerido', 400);
  const row = await loadOwnedEscrow(supabase, partnerId, escrowId);
  if (!row) return jsonError(req, 'Escrow no encontrado', 404);
  return jsonSuccess(req, { escrow: serializeRow(row) });
}

/** GET partner_escrow_list */
export async function listPartnerEscrows(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const { data, error } = await supabase
    .from('arcusx_partner_escrows')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return jsonError(req, 'No se pudo listar', 500);
  return jsonSuccess(req, {
    escrows: (data ?? []).map((r) => serializeRow(r as Record<string, unknown>)),
  });
}

/**
 * Partner deals — payment links (API key only).
 * Creates a shareable deal_token; escrow lifecycle reuses partner escrow motor.
 */
import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { quoteBilateralFromNominal } from '../../_shared/bilateral-fee.ts';
import { normalizePlatformFeeRate } from '../../_shared/platform-fee.ts';
import { isValidStellarG } from '../../_shared/stellar-network.ts';
import type { ApiContext } from './types.ts';
import { requirePartnerKey } from './require.ts';
import {
  preparePartnerEscrowDeploy,
  confirmPartnerEscrowDeploy,
  preparePartnerEscrowFund,
  confirmPartnerEscrowFund,
  preparePartnerEscrowRelease,
  confirmPartnerEscrowRelease,
} from './partner-escrow.ts';

async function loadPlatformFee(supabase: ApiContext['supabase']): Promise<number> {
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  return normalizePlatformFeeRate(data?.config_value);
}

function serializeDeal(row: Record<string, unknown>) {
  const token = String(row.deal_token ?? '');
  return {
    id: row.id,
    deal_token: token,
    share_url: token ? `https://arcusx.pro/d/${token}` : null,
    external_id: row.external_id ?? null,
    title: row.title,
    description: row.description ?? null,
    amount_usdc: Number(row.amount_usdc),
    payee_wallet: row.payee_wallet,
    payer_wallet: row.payer_wallet ?? null,
    escrow_id: row.escrow_id ?? null,
    status: row.status,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadOwnedDeal(
  supabase: ApiContext['supabase'],
  partnerId: string,
  dealId: string,
) {
  const { data } = await supabase
    .from('arcusx_partner_deals')
    .select('*')
    .eq('id', dealId)
    .eq('partner_id', partnerId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

/** POST partner_deal_create */
export async function createPartnerDeal(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);

  const title = String(body.title ?? '').trim();
  const payeeWallet = String(body.payee_wallet ?? '').trim();
  const payerWallet = body.payer_wallet ? String(body.payer_wallet).trim() : null;
  const amountUsdc = Number(body.amount_usdc ?? body.nominal ?? body.amount);
  const externalId = body.external_id ? String(body.external_id).trim() : null;
  const description = body.description ? String(body.description).trim().slice(0, 2000) : null;

  if (!title) return jsonError(req, 'title requerido', 400);
  if (!isValidStellarG(payeeWallet)) return jsonError(req, 'payee_wallet inválida', 400);
  if (payerWallet && !isValidStellarG(payerWallet)) return jsonError(req, 'payer_wallet inválida', 400);
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return jsonError(req, 'amount_usdc requerido (> 0)', 400);
  }

  if (externalId) {
    const { data: existing } = await supabase
      .from('arcusx_partner_deals')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('external_id', externalId)
      .maybeSingle();
    if (existing) {
      const platformFee = await loadPlatformFee(supabase);
      const quote = quoteBilateralFromNominal(amountUsdc, platformFee);
      return jsonSuccess(req, {
        existing: true,
        deal: serializeDeal(existing as Record<string, unknown>),
        quote,
      });
    }
  }

  const now = new Date().toISOString();
  const dealToken = crypto.randomUUID().replace(/-/g, '');
  const platformFee = await loadPlatformFee(supabase);
  const quote = quoteBilateralFromNominal(amountUsdc, platformFee);

  const { data, error } = await supabase
    .from('arcusx_partner_deals')
    .insert({
      partner_id: partnerId,
      deal_token: dealToken,
      external_id: externalId,
      title: title.slice(0, 200),
      description,
      amount_usdc: amountUsdc,
      payee_wallet: payeeWallet,
      payer_wallet: payerWallet,
      status: 'open',
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[partner-deals] create', error);
    return jsonError(req, 'No se pudo crear el deal', 500);
  }

  return jsonSuccess(req, {
    deal: serializeDeal(data as Record<string, unknown>),
    deal_id: data.id,
    deal_token: dealToken,
    share_url: `https://arcusx.pro/d/${dealToken}`,
    quote,
  });
}

/** GET partner_deal_get_by_token — público (token = secreto) */
export async function getPartnerDealByToken(ctx: ApiContext): Promise<Response> {
  const { req, url, body } = ctx;
  const token = String(
    url.searchParams.get('deal_token') ?? body.deal_token ?? '',
  ).trim();
  if (!token) return jsonError(req, 'deal_token requerido', 400);

  const { data, error } = await ctx.supabase
    .from('arcusx_partner_deals')
    .select('*')
    .eq('deal_token', token)
    .maybeSingle();

  if (error || !data) return jsonError(req, 'Deal no encontrado', 404);

  const platformFee = await loadPlatformFee(ctx.supabase);
  const quote = quoteBilateralFromNominal(Number(data.amount_usdc), platformFee);

  return jsonSuccess(req, {
    deal: serializeDeal(data as Record<string, unknown>),
    quote,
  });
}

/** GET partner_deal_get */
export async function getPartnerDeal(ctx: ApiContext): Promise<Response> {
  const { req, url, body } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const dealId = String(url.searchParams.get('deal_id') ?? body.deal_id ?? body.id ?? '').trim();
  if (!dealId) return jsonError(req, 'deal_id requerido', 400);
  const row = await loadOwnedDeal(supabase, partnerId, dealId);
  if (!row) return jsonError(req, 'Deal no encontrado', 404);
  return jsonSuccess(req, { deal: serializeDeal(row) });
}

/** GET partner_deal_list */
export async function listPartnerDeals(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const { data, error } = await supabase
    .from('arcusx_partner_deals')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return jsonError(req, 'No se pudo listar', 500);
  return jsonSuccess(req, {
    deals: (data ?? []).map((r) => serializeDeal(r as Record<string, unknown>)),
  });
}

async function resolveDealId(ctx: ApiContext): Promise<{ dealId: string } | Response> {
  const dealId = String(ctx.body.deal_id ?? ctx.body.id ?? '').trim();
  if (!dealId) return jsonError(ctx.req, 'deal_id requerido', 400);
  return { dealId };
}

/** Ensure escrow exists for deal: prepareDeploy with payer=client, payee=worker */
async function ensureDealEscrowPrepared(ctx: ApiContext, deal: Record<string, unknown>) {
  const payer = String(ctx.body.payer_wallet ?? ctx.body.client_wallet ?? deal.payer_wallet ?? '').trim();
  if (!isValidStellarG(payer)) {
    return { error: jsonError(ctx.req, 'payer_wallet / client_wallet requerido (G…)', 400) };
  }

  const nestedCtx: ApiContext = {
    ...ctx,
    body: {
      client_wallet: payer,
      worker_wallet: String(deal.payee_wallet),
      amount_usdc: Number(deal.amount_usdc),
      external_id: deal.external_id
        ? `deal-${deal.external_id}`
        : `deal-${deal.id}`,
      title: String(deal.title),
      description: String(deal.description ?? deal.title),
      metadata: { source: 'partner_deal', deal_id: deal.id },
    },
  };

  const prepRes = await preparePartnerEscrowDeploy(nestedCtx);
  if (!prepRes.ok) return { error: prepRes };

  const parsed = await prepRes.clone().json() as { data?: Record<string, unknown>; escrow?: Record<string, unknown> };
  const data = (parsed.data ?? parsed) as Record<string, unknown>;
  const escrow = (data.escrow ?? data) as Record<string, unknown>;
  const escrowId = String(escrow.id ?? '');

  if (escrowId) {
    await ctx.supabase
      .from('arcusx_partner_deals')
      .update({
        payer_wallet: payer,
        escrow_id: escrowId,
        status: 'escrow_prepared',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deal.id);
  }

  return { data, escrowId, payer };
}

/** POST partner_deal_fund_prepare — deploy si hace falta, luego fund XDR */
export async function preparePartnerDealFund(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const resolved = await resolveDealId(ctx);
  if (resolved instanceof Response) return resolved;
  const deal = await loadOwnedDeal(supabase, partnerId, resolved.dealId);
  if (!deal) return jsonError(req, 'Deal no encontrado', 404);

  let escrowId = String(deal.escrow_id ?? '').trim();
  let payer = String(body.payer_wallet ?? body.client_wallet ?? deal.payer_wallet ?? '').trim();

  if (!escrowId) {
    const ensured = await ensureDealEscrowPrepared(ctx, deal);
    if ('error' in ensured && ensured.error) return ensured.error;
    escrowId = ensured.escrowId!;
    payer = ensured.payer!;
    // Return deploy XDR first — client must confirm deploy before fund
    return jsonSuccess(req, {
      step: 'deploy',
      next: 'confirmDeploy then prepareFund',
      deal_id: deal.id,
      escrow_id: escrowId,
      ...(ensured.data as Record<string, unknown>),
    });
  }

  // Escrow exists — prepare fund
  const fundCtx: ApiContext = {
    ...ctx,
    body: { ...body, escrow_id: escrowId, client_wallet: payer },
  };
  const fundRes = await preparePartnerEscrowFund(fundCtx);
  if (!fundRes.ok) return fundRes;
  const parsed = await fundRes.clone().json() as { data?: Record<string, unknown> };
  const data = (parsed.data ?? parsed) as Record<string, unknown>;
  return jsonSuccess(req, { ...data, deal_id: deal.id, escrow_id: escrowId });
}

/** POST partner_deal_fund_confirm */
export async function confirmPartnerDealFund(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const resolved = await resolveDealId(ctx);
  if (resolved instanceof Response) return resolved;
  const deal = await loadOwnedDeal(supabase, partnerId, resolved.dealId);
  if (!deal) return jsonError(req, 'Deal no encontrado', 404);

  const escrowId = String(deal.escrow_id ?? body.escrow_id ?? '').trim();
  if (!escrowId) return jsonError(req, 'Deal sin escrow — llama prepareFund primero', 400);

  if (body.deploy_tx_hash || (body.signed_xdr && !body.fund_tx_hash && body.step === 'deploy')) {
    const dep = await confirmPartnerEscrowDeploy({
      ...ctx,
      body: { ...body, escrow_id: escrowId },
    });
    if (!dep.ok) return dep;
    await supabase
      .from('arcusx_partner_deals')
      .update({ status: 'deployed', updated_at: new Date().toISOString() })
      .eq('id', deal.id);
    if (!body.fund_tx_hash) {
      const parsed = await dep.clone().json() as { data?: Record<string, unknown> };
      return jsonSuccess(req, { ...(parsed.data ?? parsed), deal_id: deal.id, next: 'prepareFund' });
    }
  }

  if (body.fund_tx_hash || body.signed_xdr) {
    const fund = await confirmPartnerEscrowFund({
      ...ctx,
      body: { ...body, escrow_id: escrowId },
    });
    if (!fund.ok) return fund;
    await supabase
      .from('arcusx_partner_deals')
      .update({ status: 'funded', updated_at: new Date().toISOString() })
      .eq('id', deal.id);
    const parsed = await fund.clone().json() as { data?: Record<string, unknown> };
    return jsonSuccess(req, { ...(parsed.data ?? parsed), deal_id: deal.id });
  }

  return jsonError(req, 'fund_tx_hash o signed_xdr (fund) requerido', 400);
}

/** POST partner_deal_release_prepare */
export async function preparePartnerDealRelease(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const resolved = await resolveDealId(ctx);
  if (resolved instanceof Response) return resolved;
  const deal = await loadOwnedDeal(supabase, partnerId, resolved.dealId);
  if (!deal) return jsonError(req, 'Deal no encontrado', 404);
  const escrowId = String(deal.escrow_id ?? '').trim();
  if (!escrowId) return jsonError(req, 'Deal sin escrow', 400);
  const clientWallet = String(body.client_wallet ?? body.payer_wallet ?? deal.payer_wallet ?? '').trim();
  return preparePartnerEscrowRelease({
    ...ctx,
    body: { ...body, escrow_id: escrowId, client_wallet: clientWallet },
  });
}

/** POST partner_deal_release_confirm */
export async function confirmPartnerDealRelease(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const { supabase, partnerId } = await requirePartnerKey(ctx);
  const resolved = await resolveDealId(ctx);
  if (resolved instanceof Response) return resolved;
  const deal = await loadOwnedDeal(supabase, partnerId, resolved.dealId);
  if (!deal) return jsonError(req, 'Deal no encontrado', 404);
  const escrowId = String(deal.escrow_id ?? '').trim();
  if (!escrowId) return jsonError(req, 'Deal sin escrow', 400);

  const rel = await confirmPartnerEscrowRelease({
    ...ctx,
    body: { ...body, escrow_id: escrowId },
  });
  if (!rel.ok) return rel;

  await supabase
    .from('arcusx_partner_deals')
    .update({ status: 'released', updated_at: new Date().toISOString() })
    .eq('id', deal.id);

  const parsed = await rel.clone().json() as { data?: Record<string, unknown> };
  return jsonSuccess(req, { ...(parsed.data ?? parsed), deal_id: deal.id });
}

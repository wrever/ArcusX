import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import {
  formatFundsReleasedMessage,
  insertArcusxNotification,
  userIdForStellarWallet,
} from '../../_shared/arcusx-notifications.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import { normalizePlatformFeeRate } from '../../_shared/platform-fee.ts';
import type { ApiContext } from './types.ts';
import { requireUser } from './require.ts';

const VALID_TEMPLATES = new Set([
  'peer_car_sale',
  'rental_agreement',
  'freelancer_service',
  'online_coaching',
  'home_repair',
  'other',
]);

function isStellarG(addr: string): boolean {
  return typeof addr === 'string' && addr.startsWith('G') && addr.length === 56;
}

/** UUID v4 — un token por deal (UNIQUE en BD); no se aceptan tokens adivinables cortos */
const DEAL_TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidDealToken(token: string): boolean {
  return DEAL_TOKEN_RE.test(token);
}

function newDealToken(): string {
  return crypto.randomUUID();
}

async function platformFeeRate(supabase: ApiContext['supabase']): Promise<number> {
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  return normalizePlatformFeeRate(data?.config_value);
}

async function logDealEvent(
  supabase: ApiContext['supabase'],
  agreementId: string,
  eventType: string,
  actorUserId: number | null,
  payload: Record<string, unknown> | null,
) {
  await supabase.from('arcusx_agreement_events').insert({
    agreement_id: agreementId,
    event_type: eventType,
    actor_user_id: actorUserId,
    payload,
  });
}

function publicDealRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    deal_token: row.deal_token,
    template_id: row.template_id,
    payment_mode: row.payment_mode,
    title: row.title,
    description: row.description,
    status: row.status,
    amount_usdc: row.amount_usdc,
    fee_usdc: row.fee_usdc,
    client_total: row.client_total,
    platform_fee_rate: row.platform_fee_rate,
    funder_role: row.funder_role,
    release_signer_wallet: row.release_signer_wallet,
    beneficiary_wallet: row.beneficiary_wallet,
    initiator_wallet: row.initiator_wallet,
    counterparty_wallet: row.counterparty_wallet,
    escrow_contract_id: row.escrow_contract_id,
    expires_at: row.expires_at,
    created_at: row.created_at,
    accepted_at: row.accepted_at,
    funded_at: row.funded_at,
  };
}

export async function createDeal(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);

  const templateId = String(body.template_id ?? 'other');
  if (!VALID_TEMPLATES.has(templateId)) {
    return jsonError(req, 'Plantilla no válida', 400);
  }

  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const amountUsdc = Number(body.amount_usdc);
  const initiatorWallet = String(body.initiator_wallet ?? '').trim();
  const releaseSignerWallet = String(body.release_signer_wallet ?? body.initiator_wallet ?? '').trim();
  const beneficiaryWallet = String(body.beneficiary_wallet ?? body.initiator_wallet ?? '').trim();
  const funderRole = body.funder_role === 'initiator' ? 'initiator' : 'counterparty';
  const counterpartyWallet = body.counterparty_wallet
    ? String(body.counterparty_wallet).trim()
    : null;

  if (!title || title.length < 3) return jsonError(req, 'Título requerido (mín. 3 caracteres)', 400);
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return jsonError(req, 'Monto USDC inválido', 400);
  }
  if (!isStellarG(initiatorWallet)) return jsonError(req, 'Wallet del iniciador inválida', 400);
  if (!isStellarG(releaseSignerWallet)) return jsonError(req, 'Wallet release signer inválida', 400);
  if (!isStellarG(beneficiaryWallet)) return jsonError(req, 'Wallet beneficiario inválida', 400);
  if (counterpartyWallet && !isStellarG(counterpartyWallet)) {
    return jsonError(req, 'Wallet contraparte inválida', 400);
  }

  const feeRate = await platformFeeRate(auth.supabase);
  const clientTotal = Math.round((amountUsdc / (1 - feeRate)) * 1e7) / 1e7;
  const feeUsdc = Math.round((clientTotal - amountUsdc) * 1e7) / 1e7;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  let data: Record<string, unknown> | null = null;
  let dealToken = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    dealToken = newDealToken();
    const inserted = await auth.supabase.from('arcusx_agreements').insert({
      deal_token: dealToken,
      template_id: templateId,
      payment_mode: 'one_time',
      title,
      description,
      initiator_user_id: auth.userId,
      initiator_wallet: initiatorWallet,
      counterparty_wallet: counterpartyWallet,
      release_signer_wallet: releaseSignerWallet,
      beneficiary_wallet: beneficiaryWallet,
      funder_role: funderRole,
      amount_usdc: amountUsdc,
      fee_usdc: feeUsdc,
      client_total: clientTotal,
      platform_fee_rate: feeRate,
      status: 'sent',
      expires_at: expiresAt,
    }).select('*').single();

    if (!inserted.error) {
      data = inserted.data as Record<string, unknown>;
      break;
    }
    if (inserted.error.code !== '23505') {
      return jsonError(req, inserted.error.message, 500);
    }
  }

  if (!data) return jsonError(req, 'No se pudo generar un link único. Reintentá.', 500);

  await logDealEvent(auth.supabase, data.id as string, 'created', auth.userId, { template_id: templateId });
  await logDomainEvent(auth.supabase, {
    entity_type: 'deal',
    entity_id: data.id as string,
    event_type: 'deal.created',
    actor_user_id: auth.userId,
    payload: { deal_token: dealToken, template_id: templateId },
  });

  if (counterpartyWallet) {
    const { data: invitee } = await auth.supabase
      .from('arcusx_users')
      .select('id')
      .or(
        `wallet_address.eq.${counterpartyWallet},private_payout_wallet.eq.${counterpartyWallet}`,
      )
      .maybeSingle();
    const inviteeId = Number(invitee?.id);
    if (inviteeId > 0 && inviteeId !== auth.userId) {
      await insertArcusxNotification(auth.supabase, {
        user_id_mysql: inviteeId,
        title: 'Invitación a un acuerdo',
        message:
          `Te invitaron al acuerdo "${title}". Abre el link de pago en ArcusX para revisar y aceptar.`,
        type: 'info',
        email: true,
      });
    }
  }

  return jsonSuccess(req, {
    agreement: data,
    deal_token: dealToken,
    deal_url_path: `/deal/${dealToken}`,
  });
}

export async function getDealByToken(ctx: ApiContext): Promise<Response> {
  const { req, url, supabase } = ctx;
  const token = url.searchParams.get('deal_token')?.trim() ??
    String(ctx.body.deal_token ?? '').trim();
  if (!token) return jsonError(req, 'deal_token requerido', 400);
  if (!isValidDealToken(token)) return jsonError(req, 'Link de pago inválido', 400);

  const { data, error } = await supabase
    .from('arcusx_agreements')
    .select('*')
    .eq('deal_token', token)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);
  if (!data) return jsonError(req, 'Deal no encontrado', 404);

  if (data.expires_at && new Date(data.expires_at as string) < new Date() &&
    !['funded', 'active', 'completed'].includes(String(data.status))) {
    return jsonError(req, 'Este link de pago expiró', 410);
  }

  const deal = publicDealRow(data as Record<string, unknown>);
  const extra: Record<string, unknown> = { deal };
  if (ctx.userId != null) {
    const uid = ctx.userId;
    extra.viewer_role =
      data.initiator_user_id === uid
        ? 'initiator'
        : data.counterparty_user_id === uid
        ? 'counterparty'
        : 'guest';
    extra.can_accept =
      data.initiator_user_id !== uid &&
      data.status === 'sent' &&
      (data.counterparty_user_id == null || data.counterparty_user_id === uid);
  }
  return jsonSuccess(req, extra);
}

export async function getMyDeals(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const { data, error } = await auth.supabase
    .from('arcusx_agreements')
    .select('*')
    .or(`initiator_user_id.eq.${auth.userId},counterparty_user_id.eq.${auth.userId}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, { deals: data ?? [] });
}

export async function acceptDeal(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);

  const dealToken = String(body.deal_token ?? '').trim();
  const wallet = String(body.wallet_address ?? '').trim();
  if (!dealToken) return jsonError(req, 'deal_token requerido', 400);
  if (!isValidDealToken(dealToken)) return jsonError(req, 'Link de pago inválido', 400);
  if (!isStellarG(wallet)) return jsonError(req, 'Wallet inválida', 400);

  const { data: deal } = await auth.supabase
    .from('arcusx_agreements')
    .select('*')
    .eq('deal_token', dealToken)
    .maybeSingle();

  if (!deal) return jsonError(req, 'Deal no encontrado', 404);
  if (deal.initiator_user_id === auth.userId) {
    return jsonError(req, 'No puedes aceptar tu propio deal', 400);
  }
  if (String(deal.status) !== 'sent') {
    return jsonError(req, 'Este deal ya no acepta participantes', 400);
  }
  if (deal.counterparty_user_id && deal.counterparty_user_id !== auth.userId) {
    return jsonError(req, 'Otra cuenta ya aceptó este deal', 403);
  }

  const patch: Record<string, unknown> = {
    counterparty_user_id: auth.userId,
    counterparty_wallet: wallet,
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (deal.funder_role === 'initiator') {
    patch.beneficiary_wallet = wallet;
  }

  const { error } = await auth.supabase
    .from('arcusx_agreements')
    .update(patch)
    .eq('id', deal.id);

  if (error) return jsonError(req, error.message, 500);

  await logDealEvent(auth.supabase, deal.id as string, 'accepted', auth.userId, { wallet });
  await insertArcusxNotification(auth.supabase, {
    user_id_mysql: Number(deal.initiator_user_id),
    title: 'Deal aceptado',
    message: `Tu acuerdo "${deal.title}" fue aceptado. El pagador puede fondear el escrow.`,
    type: 'success',
    email: false,
  });

  return jsonSuccess(req, { message: 'Deal aceptado', status: 'accepted' });
}

export async function finalizeDealEscrow(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);

  const dealId = String(body.agreement_id ?? body.deal_id ?? '');
  const escrowId = String(body.escrow_id ?? body.escrow_contract_id ?? '').trim();
  const txHash = body.transaction_hash ? String(body.transaction_hash) : null;

  if (!dealId || !escrowId) return jsonError(req, 'agreement_id y escrow_id requeridos', 400);

  const { data: deal } = await auth.supabase
    .from('arcusx_agreements')
    .select('*')
    .eq('id', dealId)
    .single();

  if (!deal) return jsonError(req, 'Deal no encontrado', 404);

  const funderWallet = String(
    deal.funder_role === 'initiator' ? deal.initiator_wallet : deal.counterparty_wallet,
  );
  const { data: actor } = await auth.supabase
    .from('arcusx_users')
    .select('wallet_address')
    .eq('id', auth.userId)
    .single();
  const actorWallet = String(actor?.wallet_address ?? '').trim();
  const isParty = deal.initiator_user_id === auth.userId ||
    deal.counterparty_user_id === auth.userId;
  if (!isParty) return jsonError(req, 'Sin permisos', 403);
  if (!funderWallet || actorWallet !== funderWallet) {
    return jsonError(req, 'Solo el pagador puede confirmar el fondeo', 403);
  }

  const { error } = await auth.supabase.from('arcusx_agreements').update({
    escrow_contract_id: escrowId,
    escrow_tx_hash: txHash,
    status: 'funded',
    funded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', dealId);

  if (error) return jsonError(req, error.message, 500);

  await logDealEvent(auth.supabase, dealId, 'funded', auth.userId, { escrow_id: escrowId });

  const notifyIds = [Number(deal.initiator_user_id), Number(deal.counterparty_user_id)].filter(Boolean);
  for (const uid of notifyIds) {
    await insertArcusxNotification(auth.supabase, {
      user_id_mysql: uid,
      title: 'Escrow del deal fondeado',
      message: `El acuerdo "${deal.title}" tiene fondos en custodia USDC.`,
      type: 'success',
      email: false,
    });
  }

  return jsonSuccess(req, { message: 'Escrow fondeado', status: 'funded' });
}

export async function completeDeal(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const dealId = String(body.agreement_id ?? '');
  if (!dealId) return jsonError(req, 'agreement_id requerido', 400);

  const { data: deal } = await auth.supabase
    .from('arcusx_agreements')
    .select('*')
    .eq('id', dealId)
    .single();

  if (!deal) return jsonError(req, 'Deal no encontrado', 404);
  if (!['funded', 'active'].includes(String(deal.status))) {
    return jsonError(req, 'Estado inválido', 400);
  }

  const isParty = deal.initiator_user_id === auth.userId ||
    deal.counterparty_user_id === auth.userId;
  if (!isParty) return jsonError(req, 'Sin permisos', 403);

  await auth.supabase.from('arcusx_agreements').update({
    status: 'active',
    updated_at: new Date().toISOString(),
  }).eq('id', dealId);

  await logDealEvent(auth.supabase, dealId, 'marked_active', auth.userId, null);
  return jsonSuccess(req, { message: 'Deal en ejecución', status: 'active' });
}

export async function markDealReleased(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const dealId = String(body.agreement_id ?? '');
  const txHash = body.transaction_hash ? String(body.transaction_hash) : null;
  if (!dealId) return jsonError(req, 'agreement_id requerido', 400);

  const { data: deal } = await auth.supabase
    .from('arcusx_agreements')
    .select('*')
    .eq('id', dealId)
    .single();

  if (!deal) return jsonError(req, 'Deal no encontrado', 404);

  const { data: user } = await auth.supabase
    .from('arcusx_users')
    .select('wallet_address')
    .eq('id', auth.userId)
    .single();

  const wallet = String(user?.wallet_address ?? '').trim();
  if (wallet !== String(deal.release_signer_wallet)) {
    return jsonError(req, 'Solo el release signer puede marcar fondos liberados', 403);
  }

  const { error } = await auth.supabase.from('arcusx_agreements').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    escrow_tx_hash: txHash ?? deal.escrow_tx_hash,
  }).eq('id', dealId);

  if (error) return jsonError(req, error.message, 500);

  await logDealEvent(auth.supabase, dealId, 'released', auth.userId, { tx_hash: txHash });

  const dealLabel = `"${deal.title}"`;
  const beneficiaryWallet = String(deal.beneficiary_wallet ?? '').trim();
  const payeeId = await userIdForStellarWallet(auth.supabase, beneficiaryWallet);

  if (payeeId) {
    await insertArcusxNotification(auth.supabase, {
      user_id_mysql: payeeId,
      title: 'Ya liberaron tus fondos',
      message: formatFundsReleasedMessage(`el acuerdo ${dealLabel}`),
      type: 'success',
      email: true,
    });
  }

  for (const uid of [Number(deal.initiator_user_id), Number(deal.counterparty_user_id)]) {
    if (!uid || uid === payeeId) continue;
    await insertArcusxNotification(auth.supabase, {
      user_id_mysql: uid,
      title: 'Deal completado',
      message: `Los fondos del acuerdo ${dealLabel} fueron liberados.`,
      type: 'success',
      email: false,
    });
  }

  return jsonSuccess(req, { message: 'Deal completado', status: 'completed' });
}

export async function getDealDetails(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const id = url.searchParams.get('agreement_id') ?? url.searchParams.get('id');
  if (!id) return jsonError(req, 'agreement_id requerido', 400);

  const { data, error } = await auth.supabase
    .from('arcusx_agreements')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);
  if (!data) return jsonError(req, 'Deal no encontrado', 404);

  const isParty = data.initiator_user_id === auth.userId ||
    data.counterparty_user_id === auth.userId;
  if (!isParty) return jsonError(req, 'Sin permisos', 403);

  return jsonSuccess(req, { deal: data });
}

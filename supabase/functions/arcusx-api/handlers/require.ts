import {
  requireUser as authRequireUser,
  requireAdmin as authRequireAdmin,
  type AuthContext,
} from '../../_shared/arcusx-auth.ts';
import { bearerToken } from '../../_shared/arcusx-jwt.ts';
import { isPartnerApiKey } from '../../_shared/partner-api-keys.ts';
import type { ApiContext } from './types.ts';

export async function requireUser(ctx: { req: Request }): Promise<AuthContext> {
  return authRequireUser(ctx.req);
}

export async function requireAdmin(ctx: { req: Request }): Promise<AuthContext> {
  return authRequireAdmin(ctx.req);
}

/**
 * Auth para integraciones agénticas: JWT de usuario **o** solo API key de partner.
 * Con solo API key se actúa como el owner_user_id del partner (servidor/agente).
 *
 * Throws coded Unauthorized messages so the router can return stable SOW 3 envelopes:
 * - `Unauthorized:missing_api_key`
 * - `Unauthorized:invalid_api_key`
 * - `Unauthorized:partner_missing_owner`
 */
export async function requirePartnerAuth(ctx: ApiContext): Promise<AuthContext> {
  const token = bearerToken(ctx.req);
  // Bearer axk_* is a partner key, not a user JWT. Skip requireUser or we 401
  // with invalid_or_missing_token when hitting Edge without the public gateway rewrite.
  if (token && !isPartnerApiKey(token)) {
    return requireUser(ctx);
  }

  if (!ctx.partnerId) {
    throw new Error('Unauthorized:missing_api_key');
  }

  const { data: partner } = await ctx.supabase
    .from('arcusx_partners')
    .select('owner_user_id, status')
    .eq('id', ctx.partnerId)
    .maybeSingle();

  if (!partner || partner.status === 'suspended') {
    throw new Error('Unauthorized:invalid_api_key');
  }

  const ownerId = partner.owner_user_id != null ? Number(partner.owner_user_id) : null;
  if (ownerId == null) {
    throw new Error('Unauthorized:partner_missing_owner');
  }

  return {
    supabase: ctx.supabase,
    userId: ownerId,
  };
}

/**
 * Partner-key-only (sin JWT, sin owner_user_id).
 * Para el rail de escrow standalone: wallets + monto + comisión ArcusX.
 */
export async function requirePartnerKey(ctx: ApiContext): Promise<{
  supabase: ApiContext['supabase'];
  partnerId: string;
}> {
  if (!ctx.partnerId) {
    throw new Error('Unauthorized');
  }
  const { data: partner } = await ctx.supabase
    .from('arcusx_partners')
    .select('id, status')
    .eq('id', ctx.partnerId)
    .maybeSingle();
  if (!partner || partner.status === 'suspended') {
    throw new Error('Unauthorized');
  }
  return { supabase: ctx.supabase, partnerId: ctx.partnerId };
}

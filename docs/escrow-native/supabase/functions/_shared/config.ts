import { DEFAULT_CLIENT_FEE_BPS, DEFAULT_FREELANCER_FEE_BPS } from './fees.ts';

/** Lee bps desde env (override) o defaults 150/150. */
export function getFeeBpsFromEnv(): {
  clientFeeBps: number;
  freelancerFeeBps: number;
} {
  const client = Deno.env.get('CLIENT_FEE_BPS');
  const freelancer = Deno.env.get('FREELANCER_FEE_BPS');
  return {
    clientFeeBps: client ? Number(client) : DEFAULT_CLIENT_FEE_BPS,
    freelancerFeeBps: freelancer ? Number(freelancer) : DEFAULT_FREELANCER_FEE_BPS,
  };
}

export function isEscrowNativeGloballyEnabled(): boolean {
  const v = (Deno.env.get('ESCROW_NATIVE_ENABLED') ?? 'false').toLowerCase();
  return v === 'true' || v === '1';
}

import { supabaseService } from './referral-db.ts';

export function isReferralInternalCaller(req: Request): boolean {
  const expected = Deno.env.get('REFERRAL_INTERNAL_SECRET');
  if (!expected) return false;
  const got = req.headers.get('x-referral-internal-secret') ??
    req.headers.get('X-Referral-Internal-Secret');
  return got === expected;
}

/**
 * Permite atribución desde PHP (secret interno) o desde el cliente tras OAuth (JWT del usuario).
 */
export async function assertReferralCaller(
  req: Request,
  supabaseUserId: string,
): Promise<void> {
  if (isReferralInternalCaller(req)) return;

  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw new Error('No autorizado');
  }

  const supabase = supabaseService();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.id || user.id !== supabaseUserId) {
    throw new Error('No autorizado');
  }
}

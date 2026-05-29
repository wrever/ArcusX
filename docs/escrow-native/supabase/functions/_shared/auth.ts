import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { assertStellarAddress } from './validation.ts';

export interface AuthContext {
  userId: string;
  email?: string;
}

function supabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function bearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export function isAuthDisabled(): boolean {
  const v = (Deno.env.get('ESCROW_AUTH_DISABLED') ?? 'false').toLowerCase();
  return v === 'true' || v === '1';
}

/** Valida JWT Supabase (o bypass en dev con ESCROW_AUTH_DISABLED). */
export async function requireAuth(req: Request): Promise<AuthContext | null> {
  if (isAuthDisabled()) return null;

  const token = bearerToken(req);
  if (!token) {
    throw new Error('Authorization Bearer requerido');
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Token inválido o expirado');
  }

  return {
    userId: data.user.id,
    email: data.user.email,
  };
}

export function requireWalletParticipant(
  wallet: string,
  clientWallet: string,
  freelancerWallet: string,
): void {
  assertStellarAddress(wallet, 'signer_wallet');
  if (wallet !== clientWallet && wallet !== freelancerWallet) {
    throw new Error('La wallet no participa en este escrow');
  }
}

export function requireAdminWallet(wallet: string): void {
  assertStellarAddress(wallet, 'admin_wallet');
  const raw = Deno.env.get('ARCUSX_ADMIN_WALLETS') ?? '';
  const admins = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (admins.length === 0) {
    throw new Error('ARCUSX_ADMIN_WALLETS no configurado');
  }
  if (!admins.includes(wallet)) {
    throw new Error('Wallet no autorizada como admin');
  }
}

export type TaskRole = 'client' | 'freelancer' | 'admin';

function isTaskMembershipEnforced(): boolean {
  const v = (Deno.env.get('ESCROW_ENFORCE_TASK_MEMBERSHIP') ?? 'true')
    .toLowerCase();
  return v !== 'false' && v !== '0';
}

/**
 * Verifica que el usuario Supabase sea miembro de la tarea (tabla arcusx_task_members).
 * Cuando tasks vivan 100% en Supabase, esto es la barrera principal anti-IDOR.
 */
export async function requireTaskMembership(
  userId: string,
  taskId: number,
  allowedRoles?: TaskRole[],
): Promise<{ role: TaskRole; wallet: string }> {
  if (!isTaskMembershipEnforced()) {
    return { role: 'client', wallet: '' };
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('arcusx_task_members')
    .select('role, wallet')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') {
      throw new Error(
        'arcusx_task_members no existe; aplicar migración de seguridad',
      );
    }
    throw new Error('No se pudo verificar membresía de tarea');
  }

  if (!data) {
    throw new Error('No autorizado para esta tarea');
  }

  const role = data.role as TaskRole;
  if (allowedRoles && !allowedRoles.includes(role) && role !== 'admin') {
    throw new Error(`Rol ${role} no permitido para esta operación`);
  }

  return { role, wallet: String(data.wallet) };
}

/** Wallet del body debe coincidir con la registrada en task_members (anti suplantación). */
export function assertWalletMatchesMembership(
  signerWallet: string,
  memberWallet: string,
): void {
  if (!memberWallet) return;
  if (signerWallet !== memberWallet) {
    throw new Error('signer_wallet no coincide con la wallet del usuario en la tarea');
  }
}

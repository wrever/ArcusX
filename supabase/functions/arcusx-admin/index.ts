import { handleOptions, jsonError } from '../_shared/arcusx-cors.ts';
import { supabaseService } from '../_shared/referral-db.ts';
import { signArcusxJwt, bearerToken, verifyArcusxJwt } from '../_shared/arcusx-jwt.ts';
import { compare } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { ADMIN_ROUTES } from './handlers.ts';

async function requireAdmin(req: Request) {
  const token = bearerToken(req);
  if (!token) throw new Error('Unauthorized');
  const jwt = await verifyArcusxJwt(token);
  if (!jwt?.isAdmin) throw new Error('Forbidden');
  const supabase = supabaseService();
  const { data } = await supabase.from('arcusx_users').select('is_admin, role').eq('id', jwt.userId).single();
  if (!data?.is_admin && data?.role !== 'admin') throw new Error('Forbidden');
  return { supabase, userId: jwt.userId, jwt };
}

async function adminLogin(req: Request, body: Record<string, unknown>) {
  const email = String(body.email ?? '').toLowerCase();
  const password = String(body.password ?? '');
  if (!email || !password) return jsonError(req, 'Faltan email o password.', 400);

  const supabase = supabaseService();
  const { data: user } = await supabase
    .from('arcusx_users')
    .select('id, username, email, password_hash, is_admin, role')
    .eq('email', email)
    .maybeSingle();

  if (!user?.password_hash || (!user.is_admin && user.role !== 'admin')) {
    return jsonError(req, 'Credenciales incorrectas.', 401);
  }

  const ok = await compare(password, user.password_hash);
  if (!ok) return jsonError(req, 'Credenciales incorrectas.', 401);

  const token = await signArcusxJwt({
    userId: user.id as number,
    username: user.username as string,
    email: user.email as string,
    isAdmin: true,
    role: 'admin',
  }, 3600 * 24 * 7);

  return new Response(JSON.stringify({
    success: true,
    message: 'Login exitoso',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: true,
      role: user.role ?? 'admin',
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const url = new URL(req.url);
  const action = url.searchParams.get('action')?.trim() ?? '';
  let body: Record<string, unknown> = {};
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.json();
    } catch { /* empty */ }
  }

  try {
    if (action === 'admin_login' || (!action && url.pathname.endsWith('admin_login'))) {
      if (req.method !== 'POST') return jsonError(req, 'Método no permitido', 405);
      return adminLogin(req, body);
    }

    const auth = await requireAdmin(req);
    const handler = ADMIN_ROUTES[action];
    if (!handler) {
      return jsonError(req, `Acción admin no implementada: ${action}`, 501, 'not_implemented');
    }

    return handler({
      req,
      url,
      supabase: auth.supabase,
      userId: auth.userId,
      body,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 500;
    return jsonError(req, msg, status);
  }
});

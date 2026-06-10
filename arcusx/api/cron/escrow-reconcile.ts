/**
 * Legacy: ruta para despliegues con Vercel Cron.
 * ArcusX prod usa cPanel cron → Supabase directo (ver docs/supabase/CRON_SECRET.md).
 */
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET?.trim() ||
    process.env.ARCUSX_CRON_SECRET?.trim();
  const auth = req.headers.get('authorization') ?? '';

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const base = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
    .replace(/\/$/, '');
  if (!base) {
    return new Response(JSON.stringify({ success: false, message: 'Missing SUPABASE_URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const reconcileSecret = process.env.ARCUSX_CRON_SECRET?.trim() || cronSecret;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (reconcileSecret) {
    headers.Authorization = `Bearer ${reconcileSecret}`;
  }

  const res = await fetch(`${base}/functions/v1/arcusx-escrow-reconcile`, {
    method: 'POST',
    headers,
  });
  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

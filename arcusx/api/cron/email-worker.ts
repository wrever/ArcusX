/** Legacy Vercel Cron proxy. Prod ArcusX: cPanel curl → arcusx-email-worker (CRON_SECRET.md). */
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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cronSecret) {
    headers.Authorization = `Bearer ${cronSecret}`;
    headers['x-cron-secret'] = cronSecret;
  }

  const res = await fetch(`${base}/functions/v1/arcusx-email-worker`, {
    method: 'POST',
    headers,
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

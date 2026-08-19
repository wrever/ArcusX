/**
 * Partner-path checks (API key only). No JWT, no wallet, no on-chain evidence.
 */
import { ArcusXApiError, ArcusXClient } from '@arcusx/sdk';

export type SuiteCheck = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  ms: number;
};

export type SuiteReport = {
  startedAt: string;
  gateway: string;
  passed: number;
  failed: number;
  checks: SuiteCheck[];
};

type RunOne = () => Promise<{ pass: boolean; detail: string }>;

async function timed(id: string, label: string, fn: RunOne): Promise<SuiteCheck> {
  const t0 = performance.now();
  try {
    const { pass, detail } = await fn();
    return { id, label, pass, detail, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    const detail =
      e instanceof ArcusXApiError
        ? `[${e.code}] ${e.message} (HTTP ${e.status})`
        : e instanceof Error
          ? e.message
          : String(e);
    return { id, label, pass: false, detail, ms: Math.round(performance.now() - t0) };
  }
}

export async function runPartnerSuite(
  client: ArcusXClient,
  opts: { gatewayLabel: string },
): Promise<SuiteReport> {
  const checks: SuiteCheck[] = [];

  checks.push(
    await timed('fee', 'public.getPlatformFee → 0.02', async () => {
      const fee = await client.public.getPlatformFee();
      const v = Number(fee.platform_fee);
      const pass = v === 0.02;
      return { pass, detail: pass ? `platform_fee=${v}` : `expected 0.02 got ${v}` };
    }),
  );

  checks.push(
    await timed('stats', 'public.getMarketStats', async () => {
      const stats = await client.public.getMarketStats();
      const keys = Object.keys(stats || {});
      const pass = keys.includes('open_tasks') || keys.includes('total_users');
      return {
        pass,
        detail: pass
          ? `open_tasks=${(stats as { open_tasks?: number }).open_tasks ?? '?'}`
          : `keys=${keys.slice(0, 6).join(',')}`,
      };
    }),
  );

  checks.push(
    await timed('tasks', 'public.getTasks', async () => {
      const list = await client.public.getTasks({ sort_by: 'date_desc' });
      const rows = Array.isArray(list) ? list : [];
      return { pass: true, detail: `count=${rows.length}` };
    }),
  );

  checks.push(
    await timed('quote', 'escrow.quote(50)', async () => {
      const res = await client.escrow.quote(50);
      const q = res.quote;
      const pass = Boolean(q) && Number(q.nominal) > 0;
      return {
        pass,
        detail: pass
          ? `nominal=${q.nominal} totalCommission=${q.totalCommission}`
          : JSON.stringify(res).slice(0, 120),
      };
    }),
  );

  checks.push(
    await timed('quote_invalid', 'escrow.quote(0) → 400', async () => {
      try {
        await client.escrow.quote(0);
        return { pass: false, detail: 'expected ArcusXApiError' };
      } catch (e) {
        const ok = e instanceof ArcusXApiError && e.status >= 400 && e.status < 500;
        return {
          pass: ok,
          detail: e instanceof ArcusXApiError ? `${e.status} ${e.code || e.message}` : String(e),
        };
      }
    }),
  );

  checks.push(
    await timed('auth_invalid', 'invalid API key → 401', async () => {
      const bad = new ArcusXClient({
        apiKey: 'axk_test_invalid_smoke',
        network: 'testnet',
        baseUrl: client.config.baseUrl,
      });
      try {
        await bad.public.getPlatformFee();
        return { pass: false, detail: 'expected 401' };
      } catch (e) {
        const ok =
          e instanceof ArcusXApiError &&
          e.status === 401 &&
          (e.code === 'invalid_api_key' || /invalid/i.test(e.message));
        return {
          pass: ok,
          detail: e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e),
        };
      }
    }),
  );

  checks.push(
    await timed('hmac', 'webhooks.verifySignature (local)', async () => {
      const secret = 'playground-hmac-secret';
      const body = JSON.stringify({ event: 'escrow.funded', task_id: 1 });
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
      const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const header = `sha256=${hex}`;
      const ok = await client.webhooks.verifySignature(secret, body, header);
      const bad = await client.webhooks.verifySignature(secret, body, 'sha256=00');
      const pass = ok === true && bad === false;
      return { pass, detail: pass ? 'valid=true invalid=false' : `ok=${ok} bad=${bad}` };
    }),
  );

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.length - passed;
  return {
    startedAt: new Date().toISOString(),
    gateway: opts.gatewayLabel,
    passed,
    failed,
    checks,
  };
}

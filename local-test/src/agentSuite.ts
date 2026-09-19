/**
 * SOW 3 Week 1 — agentic foundation suite (browser).
 * Paridad con scripts/smoke-sow3-week1.mjs: auth + create + status + idempotency.
 */
import { ArcusXApiError, ArcusXClient } from '@arcusx/sdk';
import type { SuiteCheck, SuiteReport } from './partnerSuite';

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

function errCode(json: unknown): string {
  const j = (json ?? {}) as Record<string, unknown>;
  const err = j.error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code?: unknown }).code ?? '');
  }
  return String(j.code ?? '');
}

async function rawJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { res, json };
}

export async function runAgenticWeek1Suite(
  client: ArcusXClient,
  opts: { gatewayLabel: string; apiKey: string; jobsBaseUrl: string },
): Promise<SuiteReport> {
  const checks: SuiteCheck[] = [];
  const jobsUrl = `${opts.jobsBaseUrl.replace(/\/$/, '')}/v1/jobs`;
  const apiKey = opts.apiKey.trim();

  checks.push(
    await timed('auth.missing_key', 'POST /v1/jobs sin key → 401', async () => {
      const { res, json } = await rawJson(jobsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ title: 'local-test-missing-key' }),
      });
      const code = errCode(json);
      const pass =
        res.status === 401 && /api_key|token|unauthorized|missing|invalid/i.test(code);
      return { pass, detail: `${res.status} ${code || '?'}` };
    }),
  );

  checks.push(
    await timed('auth.invalid_key', 'API key inválida → 401', async () => {
      const bad = new ArcusXClient({
        apiKey: 'axk_test_invalid_local_test_w1',
        network: 'testnet',
        baseUrl: client.config.baseUrl,
      });
      try {
        await bad.agent.create({ title: 'should-fail-invalid-key' });
        return { pass: false, detail: 'expected 401' };
      } catch (e) {
        const ok =
          e instanceof ArcusXApiError &&
          e.status === 401 &&
          (e.code === 'invalid_api_key' || /invalid|api_key/i.test(String(e.code)));
        return {
          pass: ok,
          detail: e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e),
        };
      }
    }),
  );

  checks.push(
    await timed('agent.missing_title', 'create sin title → 400', async () => {
      try {
        await client.agent.create({ title: '' });
        return { pass: false, detail: 'expected 400' };
      } catch (e) {
        const ok =
          e instanceof ArcusXApiError &&
          e.status === 400 &&
          (e.code === 'missing_title' || /title/i.test(String(e.code ?? e.message)));
        return {
          pass: ok,
          detail: e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e),
        };
      }
    }),
  );

  const externalRef = `local-test-sow3-w1-${Date.now()}`;
  let jobId = '';

  checks.push(
    await timed('agent.createJob', 'agent.create → job open', async () => {
      if (!apiKey) return { pass: false, detail: 'missing api key' };
      const created = await client.agent.create({
        title: 'local-test SOW3 Week1 job',
        description: 'Browser harness — create + status',
        external_ref: externalRef,
        metadata: { track: 'sow3-week1', harness: 'local-test' },
      });
      jobId = String(created.job_id || created.job?.id || '');
      const status = String(created.job?.status || '');
      const pass = Boolean(jobId) && (status === 'open' || status.length > 0);
      return {
        pass,
        detail: pass ? `job_id=${jobId.slice(0, 8)}… status=${status || '?'}` : 'no job_id',
      };
    }),
  );

  checks.push(
    await timed('agent.getJob', 'agent.get → same job', async () => {
      if (!jobId) return { pass: false, detail: 'skipped — no job_id' };
      const { job } = await client.agent.get(jobId);
      const pass = job?.id === jobId;
      return {
        pass,
        detail: pass
          ? `status=${job.status} subjobs=${Array.isArray(job.subjobs) ? job.subjobs.length : 0}`
          : `id mismatch ${job?.id}`,
      };
    }),
  );

  checks.push(
    await timed('agent.create_idempotent', 'mismo external_ref → same job_id', async () => {
      if (!jobId) return { pass: false, detail: 'skipped — no job_id' };
      const again = (await client.agent.create({
        title: 'local-test SOW3 Week1 job',
        external_ref: externalRef,
      })) as { job_id?: string; job?: { id?: string }; existing?: boolean };
      const againId = String(again.job_id || again.job?.id || '');
      const same = againId === jobId;
      const pass = same;
      return {
        pass,
        detail: `same=${same} existing=${again.existing === true || same}`,
      };
    }),
  );

  checks.push(
    await timed('agent.invalid_job_id', 'GET job id inválido → 400', async () => {
      try {
        await client.agent.get('not-a-uuid');
        return { pass: false, detail: 'expected 400' };
      } catch (e) {
        const ok =
          e instanceof ArcusXApiError &&
          e.status === 400 &&
          (e.code === 'invalid_job_id' || /invalid|job/i.test(String(e.code ?? e.message)));
        return {
          pass: ok,
          detail: e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e),
        };
      }
    }),
  );

  checks.push(
    await timed('agent.list', 'agent.list', async () => {
      const res = await client.agent.list();
      const count = Number(res.count ?? res.jobs?.length ?? 0);
      const pass = Array.isArray(res.jobs);
      return { pass, detail: `count=${count}` };
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

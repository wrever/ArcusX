/**
 * Agentic payments — visual journey test app (Testnet).
 * Live: auth → create job → create subjob → escrow quote → status.
 * Next (shown locked): fund USDC → release payout.
 */
import { useState } from 'react';
import { ArcusXApiError } from '@arcusx/sdk';
import {
  createPartnerClient,
  gatewayHint,
  loadConfig,
  saveConfig,
  type LocalTestConfig,
} from './sdk';

type StepId =
  | 'auth'
  | 'job'
  | 'subjob'
  | 'quote'
  | 'status'
  | 'fund'
  | 'release';

type StepState = 'idle' | 'running' | 'done' | 'error' | 'locked';

type Step = {
  id: StepId;
  n: number;
  label: string;
  live: boolean;
  detail: string;
};

const STEPS: Step[] = [
  { id: 'auth', n: 1, label: 'Auth', live: true, detail: 'Partner API key' },
  { id: 'job', n: 2, label: 'Create job', live: true, detail: 'Orchestrator intent' },
  { id: 'subjob', n: 3, label: 'Create subjob', live: true, detail: 'Work unit + amount' },
  { id: 'quote', n: 4, label: 'Escrow quote', live: true, detail: 'USDC + fee' },
  { id: 'status', n: 5, label: 'Status', live: true, detail: 'Job + subjob open' },
  { id: 'fund', n: 6, label: 'Fund escrow', live: false, detail: 'Sign XDR (próximo)' },
  { id: 'release', n: 7, label: 'Release', live: false, detail: 'Payout on-chain (próximo)' },
];

type Snapshot = {
  jobId: string;
  jobStatus: string;
  jobTitle: string;
  subjobId: string;
  subjobStatus: string;
  taskId: string | number;
  amount: number;
  quote: Record<string, unknown> | null;
  externalRef: string;
};

type Props = {
  onOpenHarness?: () => void;
  onOpenWeek1?: () => void;
};

function initialStates(): Record<StepId, StepState> {
  return Object.fromEntries(
    STEPS.map((s) => [s.id, s.live ? 'idle' : 'locked']),
  ) as Record<StepId, StepState>;
}

export default function AgenticPaymentsDemo({ onOpenHarness, onOpenWeek1 }: Props) {
  const [config, setConfig] = useState<LocalTestConfig>(loadConfig);
  const [showKey, setShowKey] = useState(false);
  const [running, setRunning] = useState(false);
  const [amount, setAmount] = useState('2.5');
  const [jobTitle, setJobTitle] = useState('Research pipeline — orchestrator');
  const [jobDescription, setJobDescription] = useState(
    'El agente orquestador define el trabajo y el pago en USDC.',
  );
  const [workTitle, setWorkTitle] = useState('Fetch sources + summarize');
  const [executorWallet, setExecutorWallet] = useState(
    () =>
      import.meta.env.VITE_TEST_WORKER_WALLET?.trim() ||
      'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D',
  );
  const [payerWallet, setPayerWallet] = useState(
    () =>
      import.meta.env.VITE_TEST_CLIENT_WALLET?.trim() ||
      import.meta.env.VITE_PLATFORM_WALLET?.trim() ||
      '',
  );
  const [stepState, setStepState] = useState<Record<StepId, StepState>>(initialStates);
  const [log, setLog] = useState<string[]>([]);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);

  const hasKey = Boolean(config.apiKey.trim());

  function patchKey(apiKey: string) {
    const next = { ...config, apiKey };
    setConfig(next);
    saveConfig(next);
  }

  function pushLog(line: string) {
    setLog((prev) => [...prev.slice(-12), line]);
  }

  function mark(id: StepId, state: StepState) {
    setStepState((prev) => ({ ...prev, [id]: state }));
  }

  async function runJourney() {
    if (!hasKey || running) return;
    setRunning(true);
    setError(null);
    setSnap(null);
    setLog([]);
    setMs(null);
    setStepState(initialStates());

    const t0 = performance.now();
    const client = createPartnerClient(config);
    const externalRef = `agentic-ui-${Date.now()}`;
    const workerAmount = Number(amount) || 2.5;
    const title = jobTitle.trim() || 'Agentic job';
    const description =
      jobDescription.trim() || 'Job creado por un agente vía @arcusx/sdk';
    const subTitle = workTitle.trim() || title;

    try {
      mark('auth', 'running');
      pushLog('→ Validando partner key (agent.list)…');
      await client.agent.list();
      mark('auth', 'done');
      pushLog('✓ Auth OK');

      mark('job', 'running');
      pushLog('→ client.agent.create(job)');
      const created = await client.agent.create({
        title,
        description,
        external_ref: externalRef,
        ...(payerWallet.startsWith('G') ? { payer_wallet: payerWallet } : {}),
        metadata: { track: 'agentic-payments', demo: 'visual-journey' },
      });
      const jobId = String(created.job_id || created.job?.id || '');
      if (!jobId) throw new Error('Create job sin job_id');
      mark('job', 'done');
      pushLog(`✓ Job ${jobId.slice(0, 8)}… status=${created.job?.status ?? 'open'}`);

      mark('subjob', 'running');
      pushLog(`→ client.agent.createSubjob(${jobId.slice(0, 8)}…, ${workerAmount} USDC)`);
      const sub = await client.agent.createSubjob(jobId, {
        executor_type: 'agent',
        executor_wallet: executorWallet.startsWith('G') ? executorWallet : undefined,
        worker_amount: workerAmount,
        completion_condition: 'manual_approve',
        external_ref: `${externalRef}-work`,
        title: subTitle,
        description,
      });
      const subjobId = String(sub.subjob_id || sub.subjob?.id || '');
      if (!subjobId) throw new Error('Create subjob sin subjob_id');
      mark('subjob', 'done');
      pushLog(
        `✓ Subjob ${subjobId.slice(0, 8)}… task_id=${sub.task_id ?? '?'} status=${sub.subjob?.status ?? 'open'}`,
      );

      mark('quote', 'running');
      pushLog(`→ client.agent.quoteEscrow(${subjobId.slice(0, 8)}…)`);
      const quoteRes = await client.agent.quoteEscrow(subjobId);
      mark('quote', 'done');
      const raw = quoteRes as unknown as {
        quote?: Record<string, unknown>;
        nominal?: unknown;
        totalCommission?: unknown;
        platform_fee?: unknown;
        worker_amount?: unknown;
      };
      const q = (raw.quote ?? raw) as Record<string, unknown>;
      pushLog(
        `✓ Quote nominal=${String(q.nominal ?? q.worker_amount ?? workerAmount)} fee=${String(q.totalCommission ?? q.platform_fee ?? '—')}`,
      );

      mark('status', 'running');
      pushLog('→ client.agent.get(job) + getSubjob');
      const { job } = await client.agent.get(jobId);
      const { subjob } = await client.agent.getSubjob(subjobId);
      mark('status', 'done');
      pushLog(`✓ job=${job.status} · subjob=${subjob.status} · subjobs=${job.subjobs?.length ?? 1}`);

      setSnap({
        jobId,
        jobStatus: job.status,
        jobTitle: job.title || title,
        subjobId,
        subjobStatus: subjob.status,
        taskId: sub.task_id ?? subjob.task_id ?? '—',
        amount: workerAmount,
        quote: q && typeof q === 'object' ? q : null,
        externalRef,
      });

      setMs(Math.round(performance.now() - t0));
      pushLog('Recorrido off-chain listo. Fund + release on-chain = siguiente hito.');
    } catch (e) {
      let msg: string;
      if (e instanceof ArcusXApiError) {
        msg = `[${e.code}] ${e.message} (HTTP ${e.status})`;
      } else {
        msg = e instanceof Error ? e.message : String(e);
      }
      setError(msg);
      pushLog(`✗ ${msg}`);
      setStepState((prev) => {
        const next = { ...prev };
        for (const s of STEPS) {
          if (s.live && next[s.id] === 'running') next[s.id] = 'error';
        }
        return next;
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="aj-demo">
      <div className="aj-sky" aria-hidden />

      <header className="aj-top">
        <div className="aj-brand">
          <span className="aj-mark">ArcusX</span>
          <span className="aj-pill">Agentic payments · Testnet</span>
        </div>
        <h1 className="aj-title">
          Recorrido de pago agentico
          <span className="aj-title-sub">
            Un agente orquesta job → subjob → quote — sin UI del marketplace
          </span>
        </h1>
        <p className="aj-lede">
          App de prueba visual sobre <code>@arcusx/sdk</code> + partner key. Corre el camino
          real en <code>api.arcusx.pro</code>. Fund/release on-chain se muestran como siguiente
          paso.
        </p>
        <div className="aj-meta">
          <span>{gatewayHint(config)}</span>
          {ms != null ? <span>{ms} ms</span> : null}
        </div>
      </header>

      <nav className="aj-path" aria-label="Recorrido">
        {STEPS.map((s, i) => {
          const st = stepState[s.id];
          return (
            <div key={s.id} className={`aj-station aj-${st} ${s.live ? 'live' : 'soon'}`}>
              {i > 0 ? <span className="aj-connector" aria-hidden /> : null}
              <div className="aj-station-inner">
                <span className="aj-n">{s.n}</span>
                <strong>{s.label}</strong>
                <small>{s.detail}</small>
                {!s.live ? <em>próximo</em> : null}
              </div>
            </div>
          );
        })}
      </nav>

      {snap ? (
        <div className="aj-cards">
          <article className="aj-card">
            <h2>Job</h2>
            <p className="aj-badge">{snap.jobStatus}</p>
            <dl>
              <div>
                <dt>id</dt>
                <dd>{snap.jobId}</dd>
              </div>
              <div>
                <dt>title</dt>
                <dd>{snap.jobTitle}</dd>
              </div>
              <div>
                <dt>ref</dt>
                <dd>{snap.externalRef}</dd>
              </div>
            </dl>
          </article>
          <article className="aj-card">
            <h2>Subjob</h2>
            <p className="aj-badge">{snap.subjobStatus}</p>
            <dl>
              <div>
                <dt>id</dt>
                <dd>{snap.subjobId}</dd>
              </div>
              <div>
                <dt>task_id</dt>
                <dd>{String(snap.taskId)}</dd>
              </div>
              <div>
                <dt>amount</dt>
                <dd>{snap.amount} USDC</dd>
              </div>
            </dl>
          </article>
          <article className="aj-card accent">
            <h2>Quote</h2>
            <p className="aj-badge">ready</p>
            <pre className="aj-quote">
              {snap.quote ? JSON.stringify(snap.quote, null, 2) : '—'}
            </pre>
          </article>
        </div>
      ) : (
        <div className="aj-empty">
          <p>
            Pulsa <strong>Correr recorrido en vivo</strong> para crear job + subjob + quote
            reales en Testnet.
          </p>
        </div>
      )}

      <section className="aj-controls">
        <div className="aj-fields">
          <label>
            API key
            <div className="aj-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => patchKey(e.target.value)}
                placeholder="axk_test_…"
                autoComplete="off"
              />
              <button type="button" className="aj-ghost" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>
          <label>
            Título del job (lo decide el agente)
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </label>
          <label>
            Descripción
            <input value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
          </label>
          <label>
            Título del subjob / tarea
            <input value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} />
          </label>
          <label>
            Monto USDC (subjob)
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            executor_wallet (G…)
            <input
              value={executorWallet}
              onChange={(e) => setExecutorWallet(e.target.value.trim())}
              placeholder="G… quien cobra"
            />
          </label>
          <label>
            payer_wallet (opcional)
            <input
              value={payerWallet}
              onChange={(e) => setPayerWallet(e.target.value.trim())}
              placeholder="G… pagador"
            />
          </label>
        </div>

        <div className="aj-actions">
          <button
            type="button"
            className="aj-primary"
            disabled={!hasKey || running}
            onClick={() => void runJourney()}
          >
            {running ? 'Corriendo recorrido…' : 'Correr recorrido en vivo'}
          </button>
          {onOpenHarness ? (
            <button type="button" className="aj-ghost" onClick={onOpenHarness}>
              Harness técnico
            </button>
          ) : null}
          {onOpenWeek1 ? (
            <button type="button" className="aj-ghost" onClick={onOpenWeek1}>
              Demo SOW3 Week1
            </button>
          ) : null}
        </div>

        {!hasKey ? (
          <p className="aj-hint">
            Necesitas <code>axk_test_…</code> (misma key del partner sandbox).
          </p>
        ) : null}
        <p className="aj-hint">
          Título y descripción los manda el agente por <code>client.agent.create</code> /{' '}
          <code>createSubjob</code>. La API key afilia el job al partner (no al marketplace
          anónimo). Si el agente omite el título del subjob, el Edge usa el del job.
        </p>
        {error ? <pre className="aj-error">{error}</pre> : null}
        {log.length > 0 ? <pre className="aj-log">{log.join('\n')}</pre> : null}
      </section>
    </div>
  );
}

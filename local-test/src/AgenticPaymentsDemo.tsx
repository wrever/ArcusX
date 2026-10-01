/**
 * Visual smoke for agentic escrow on Stellar Testnet (SOW 3 closed · v3.8.4).
 * prepare-only or Freighter fund / approve→release.
 */
import { useMemo, useState } from 'react';
import { ArcusXApiError } from '@arcusx/sdk';
import {
  createPartnerClient,
  gatewayHint,
  loadConfig,
  saveConfig,
  type LocalTestConfig,
} from './sdk';
import {
  createFreighterAdapter,
  stellarExpertContractUrl,
  stellarExpertTxUrl,
} from './freighter';

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

type Snapshot = {
  jobId: string;
  jobStatus: string;
  jobTitle: string;
  subjobId: string;
  subjobStatus: string;
  taskId: string | number;
  proposalId: string | number | null;
  amount: number;
  quote: Record<string, unknown> | null;
  externalRef: string;
  fundNote: string;
  releaseNote: string;
  mode: 'week2' | 'week3';
  contractId?: string;
  fundTxHash?: string;
  releaseTxHash?: string;
};

type Props = {
  onOpenHarness?: () => void;
  onOpenWeek1?: () => void;
};

function stepsFor(week3: boolean): Step[] {
  return [
    { id: 'auth', n: 1, label: 'auth', live: true, detail: 'axk key' },
    { id: 'job', n: 2, label: 'job', live: true, detail: 'create' },
    { id: 'subjob', n: 3, label: 'subjob', live: true, detail: 'work unit' },
    { id: 'quote', n: 4, label: 'quote', live: true, detail: 'fees' },
    { id: 'status', n: 5, label: 'status', live: true, detail: 'poll' },
    {
      id: 'fund',
      n: 6,
      label: 'fund',
      live: true,
      detail: week3 ? 'sign deploy+fund' : 'prepare',
    },
    {
      id: 'release',
      n: 7,
      label: 'release',
      live: true,
      detail: week3 ? 'approve→release ×2' : 'prepare',
    },
  ];
}

function initialStates(week3: boolean): Record<StepId, StepState> {
  return Object.fromEntries(
    stepsFor(week3).map((s) => [s.id, s.live ? 'idle' : 'locked']),
  ) as Record<StepId, StepState>;
}

async function tryPrepare(
  fn: () => Promise<Record<string, unknown>>,
): Promise<{ note: string; xdr?: string }> {
  try {
    const prep = await fn();
    const xdr = String(prep.unsigned_xdr || prep.unsignedTransaction || '').trim();
    if (xdr) return { note: `unsigned_xdr ${xdr.length} chars`, xdr };
    return { note: 'prepare 200 (sin XDR)' };
  } catch (e) {
    if (e instanceof ArcusXApiError && e.status === 401) {
      return { note: `HTTP 401 ${e.code} (redeploy Edge: partner key en prepareFund)` };
    }
    if (e instanceof ArcusXApiError && e.status !== 401 && e.status < 500) {
      return { note: `HTTP ${e.status} ${e.code}` };
    }
    throw e;
  }
}

export default function AgenticPaymentsDemo({ onOpenHarness, onOpenWeek1 }: Props) {
  const [config, setConfig] = useState<LocalTestConfig>(loadConfig);
  const [showKey, setShowKey] = useState(false);
  const [running, setRunning] = useState(false);
  const [week3Live, setWeek3Live] = useState(true);
  const [amount, setAmount] = useState('1');
  const [jobTitle, setJobTitle] = useState('test job');
  const [jobDescription, setJobDescription] = useState('local smoke');
  const [workTitle, setWorkTitle] = useState('work unit');
  const [executorUserId, setExecutorUserId] = useState(
    () => import.meta.env.VITE_AGENTIC_EXECUTOR_USER_ID?.trim() || '3',
  );
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
  const [stepState, setStepState] = useState<Record<StepId, StepState>>(() =>
    initialStates(true),
  );
  const [log, setLog] = useState<string[]>([]);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);

  const STEPS = useMemo(() => stepsFor(week3Live), [week3Live]);
  const hasKey = Boolean(config.apiKey.trim());
  const executorIdNum = Number(executorUserId);
  const hasExecutor = Number.isFinite(executorIdNum) && executorIdNum > 0;

  function patchKey(apiKey: string) {
    const next = { ...config, apiKey };
    setConfig(next);
    saveConfig(next);
  }

  function pushLog(line: string) {
    setLog((prev) => [...prev.slice(-20), line]);
  }

  function mark(id: StepId, state: StepState) {
    setStepState((prev) => ({ ...prev, [id]: state }));
  }

  async function runJourney() {
    if (!hasKey || running) return;
    if (week3Live && !hasExecutor) {
      setError('falta executor_user_id (sin eso no hay proposal)');
      return;
    }

    setRunning(true);
    setError(null);
    setSnap(null);
    setLog([]);
    setMs(null);
    setStepState(initialStates(week3Live));

    const t0 = performance.now();
    const client = createPartnerClient(config);
    const externalRef = `agentic-ui-${Date.now()}`;
    const workerAmount = Number(amount) || 1;
    const title = jobTitle.trim() || 'test job';
    const description = jobDescription.trim() || 'local smoke';
    const subTitle = workTitle.trim() || title;

    try {
      mark('auth', 'running');
      pushLog('auth…');
      await client.agent.list();
      mark('auth', 'done');
      pushLog('ok auth');

      let freighterAddress = '';
      if (week3Live) {
        pushLog('freighter…');
        const wallet = createFreighterAdapter();
        freighterAddress = await wallet.getAddress();
        pushLog(`wallet ${freighterAddress.slice(0, 6)}…${freighterAddress.slice(-4)}`);
        if (payerWallet.startsWith('G') && payerWallet !== freighterAddress) {
          pushLog('payer_wallet ≠ freighter, using freighter');
        }
      }

      const payerForCreate = week3Live
        ? freighterAddress
        : payerWallet.startsWith('G')
          ? payerWallet
          : undefined;

      mark('job', 'running');
      pushLog('create job');
      const created = await client.agent.create({
        title,
        description,
        external_ref: externalRef,
        ...(payerForCreate ? { payer_wallet: payerForCreate } : {}),
        metadata: {
          track: 'agentic-payments',
          demo: week3Live ? 'visual-week3' : 'visual-week2',
        },
      });
      const jobId = String(created.job_id || created.job?.id || '');
      if (!jobId) throw new Error('Create job sin job_id');
      mark('job', 'done');
      pushLog(`job ${jobId.slice(0, 8)} ${created.job?.status ?? 'open'}`);

      mark('subjob', 'running');
      pushLog(`create subjob ${workerAmount} usdc`);
      const sub = await client.agent.createSubjob(jobId, {
        executor_type: 'agent',
        executor_wallet: executorWallet.startsWith('G') ? executorWallet : undefined,
        ...(hasExecutor ? { executor_user_id: executorIdNum } : {}),
        worker_amount: workerAmount,
        completion_condition: 'manual_approve',
        external_ref: `${externalRef}-work`,
        title: subTitle,
        description,
      });
      const subjobId = String(sub.subjob_id || sub.subjob?.id || '');
      if (!subjobId) throw new Error('Create subjob sin subjob_id');
      const proposalId = sub.proposal_id ?? null;
      mark('subjob', 'done');
      pushLog(
        `subjob ${subjobId.slice(0, 8)} task=${sub.task_id ?? '?'} proposal=${proposalId ?? 'null'}`,
      );
      if (week3Live && !proposalId) {
        throw new Error('sin proposal_id — chequeá executor_user_id');
      }

      mark('quote', 'running');
      pushLog('quote');
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
        `quote ${String(q.nominal ?? q.worker_amount ?? workerAmount)} fee=${String(q.totalCommission ?? q.platform_fee ?? '—')}`,
      );

      mark('status', 'running');
      pushLog('status');
      let { job } = await client.agent.get(jobId);
      let { subjob } = await client.agent.getSubjob(subjobId);
      mark('status', 'done');
      pushLog(`${job.status} / ${subjob.status}`);

      let fundNote = '';
      let releaseNote = '';
      let contractId: string | undefined;
      let fundTxHash: string | undefined;
      let releaseTxHash: string | undefined;

      if (week3Live) {
        const wallet = createFreighterAdapter();

        mark('fund', 'running');
        pushLog('prepareDeploy…');
        const deployPrep = (await client.agent.prepareDeploy(
          subjobId,
          freighterAddress,
        )) as Record<string, unknown>;
        const deployUnsigned = String(deployPrep.unsigned_xdr ?? '').trim();
        if (!deployUnsigned) throw new Error('prepareDeploy sin unsigned_xdr');
        pushLog(`deploy xdr ${deployUnsigned.length} — sign`);
        const signedDeploy = await wallet.signTransaction(deployUnsigned);
        pushLog(`signed ${signedDeploy.length} — confirmDeploy`);
        const deployConfirm = (await client.agent.confirmDeploy(subjobId, {
          signed_xdr: signedDeploy,
          proposal_id: proposalId,
          client_wallet: freighterAddress,
          escrow_amount: deployPrep.fund_amount,
          ...(String(deployPrep.engagement_id ?? '')
            ? { engagement_id: deployPrep.engagement_id }
            : {}),
          ...(String(deployPrep.contract_id ?? '').startsWith('C')
            ? { contract_id: deployPrep.contract_id }
            : {}),
        })) as Record<string, unknown>;
        contractId = String(
          deployConfirm.contract_id ?? deployConfirm.escrow_id ?? '',
        ).trim();
        const deployTx = String(
          deployConfirm.deploy_tx_hash ?? deployConfirm.tx_hash ?? '',
        ).trim();
        pushLog(`deployed ${contractId.slice(0, 10) || '?'}… tx=${deployTx.slice(0, 10) || '—'}`);

        pushLog('prepareFund…');
        const fundPrep = (await client.agent.prepareFund(
          subjobId,
          freighterAddress,
        )) as Record<string, unknown>;
        const fundUnsigned = String(fundPrep.unsigned_xdr ?? '').trim();
        if (!fundUnsigned) throw new Error('prepareFund sin unsigned_xdr');
        pushLog(`fund xdr ${fundUnsigned.length} — sign`);
        const signedFund = await wallet.signTransaction(fundUnsigned);
        pushLog('confirmFund…');
        const fundConfirm = (await client.agent.confirmFund(subjobId, {
          signed_xdr: signedFund,
          proposal_id: proposalId,
          contract_id: contractId || fundPrep.contract_id,
          client_wallet: freighterAddress,
          funding_confirmed: true,
        })) as Record<string, unknown>;
        fundTxHash = String(
          fundConfirm.fund_tx_hash ?? fundConfirm.tx_hash ?? '',
        ).trim();
        if (!contractId) {
          contractId = String(fundConfirm.contract_id ?? fundPrep.contract_id ?? '').trim();
        }
        fundNote = fundTxHash
          ? `funded ${fundTxHash.slice(0, 10)}…`
          : `deployed ${contractId?.slice(0, 10) ?? '?'}…`;
        mark('fund', 'done');
        pushLog(`fund ok ${fundNote}`);
        if (deployTx) pushLog(stellarExpertTxUrl(deployTx));
        if (fundTxHash) pushLog(stellarExpertTxUrl(fundTxHash));
        if (contractId) pushLog(stellarExpertContractUrl(contractId));

        mark('release', 'running');
        pushLog('releaseSubjob (approve → release, 2 Freighter prompts)…');
        const released = await client.agent.releaseSubjob(subjobId, wallet, {
          idempotencyKey: `ui-w3-rel-${externalRef}`,
        });
        releaseTxHash = released.release_tx_hash;
        const stepHashes = released.step_hashes?.filter(Boolean) ?? [];
        releaseNote = `released ${releaseTxHash.slice(0, 10)}…`;
        mark('release', 'done');
        pushLog(`release ok ${releaseNote}`);
        for (const h of stepHashes) pushLog(stellarExpertTxUrl(h));
        if (!stepHashes.includes(releaseTxHash)) pushLog(stellarExpertTxUrl(releaseTxHash));

        ({ job } = await client.agent.get(jobId));
        ({ subjob } = await client.agent.getSubjob(subjobId));
        pushLog(`done ${job.status} / ${subjob.status}`);
      } else {
        const signer = payerWallet.startsWith('G')
          ? payerWallet
          : 'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D';

        mark('fund', 'running');
        pushLog('prepareFund');
        const fundPrep = await tryPrepare(() =>
          client.agent.prepareFund(subjobId, signer) as Promise<Record<string, unknown>>,
        );
        fundNote = fundPrep.note;
        mark('fund', 'done');
        pushLog(fundNote);

        mark('release', 'running');
        pushLog('prepareRelease');
        const relPrep = await tryPrepare(() =>
          client.agent.prepareRelease(subjobId, signer) as Promise<Record<string, unknown>>,
        );
        releaseNote = relPrep.note;
        mark('release', 'done');
        pushLog(releaseNote);
        pushLog('prepare path done — tick freighter for on-chain');
      }

      setSnap({
        jobId,
        jobStatus: job.status,
        jobTitle: job.title || title,
        subjobId,
        subjobStatus: subjob.status,
        taskId: sub.task_id ?? subjob.task_id ?? '—',
        proposalId,
        amount: workerAmount,
        quote: q && typeof q === 'object' ? q : null,
        externalRef,
        fundNote,
        releaseNote,
        mode: week3Live ? 'week3' : 'week2',
        contractId,
        fundTxHash,
        releaseTxHash,
      });

      setMs(Math.round(performance.now() - t0));
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
          <span className="aj-pill">SOW 3 · v3.8.4 · testnet</span>
        </div>
        <h1 className="aj-title">
          agentic escrow
          <span className="aj-title-sub">create → fund → approve → release</span>
        </h1>
        <p className="aj-lede">
          Partner key against <code>api.arcusx.pro</code>. Checkbox on = Freighter signs deploy,
          fund, then approve+release (2 prompts). Off = prepare-only typed checks.
        </p>
        <div className="aj-meta">
          <span>{gatewayHint(config)}</span>
          <span>{week3Live ? 'live Freighter' : 'prepare only'}</span>
          <span>Edge v133</span>
          {ms != null ? <span>{ms} ms</span> : null}
        </div>
      </header>

      <nav className="aj-path" aria-label="steps">
        {STEPS.map((s, i) => {
          const st = stepState[s.id];
          return (
            <div key={s.id} className={`aj-station aj-${st} ${s.live ? 'live' : 'soon'}`}>
              {i > 0 ? <span className="aj-connector" aria-hidden /> : null}
              <div className="aj-station-inner">
                <span className="aj-n">{s.n}</span>
                <strong>{s.label}</strong>
                <small>{s.detail}</small>
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
                <dt>task / proposal</dt>
                <dd>
                  {String(snap.taskId)} / {String(snap.proposalId ?? 'null')}
                </dd>
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
          <article className="aj-card">
            <h2>{snap.mode === 'week3' ? 'chain' : 'prepare'}</h2>
            <p className="aj-badge">{snap.mode === 'week3' ? 'signed' : 'typed'}</p>
            <dl>
              <div>
                <dt>fund</dt>
                <dd>{snap.fundNote}</dd>
              </div>
              <div>
                <dt>release</dt>
                <dd>{snap.releaseNote}</dd>
              </div>
              {snap.fundTxHash ? (
                <div>
                  <dt>fund tx</dt>
                  <dd>
                    <a href={stellarExpertTxUrl(snap.fundTxHash)} target="_blank" rel="noreferrer">
                      Expert
                    </a>
                  </dd>
                </div>
              ) : null}
              {snap.releaseTxHash ? (
                <div>
                  <dt>release tx</dt>
                  <dd>
                    <a
                      href={stellarExpertTxUrl(snap.releaseTxHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Expert
                    </a>
                  </dd>
                </div>
              ) : null}
              {snap.contractId ? (
                <div>
                  <dt>contract</dt>
                  <dd>
                    <a
                      href={stellarExpertContractUrl(snap.contractId)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Expert
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </article>
        </div>
      ) : (
        <div className="aj-empty">
          <p>
            Run it. Need Freighter + USDC on testnet if the checkbox is on.
          </p>
        </div>
      )}

      <section className="aj-controls">
        <div className="aj-fields">
          <label className="aj-check">
            <input
              type="checkbox"
              checked={week3Live}
              onChange={(e) => {
                setWeek3Live(e.target.checked);
                setStepState(initialStates(e.target.checked));
              }}
            />
            sign with Freighter (fund + approve→release ×2)
          </label>
          <label>
            api key
            <div className="aj-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => patchKey(e.target.value)}
                placeholder="axk_test_…"
                autoComplete="off"
              />
              <button type="button" className="aj-ghost" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'hide' : 'show'}
              </button>
            </div>
          </label>
          <label>
            job title
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </label>
          <label>
            description
            <input value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
          </label>
          <label>
            subjob title
            <input value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} />
          </label>
          <label>
            amount (USDC)
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            executor_user_id
            <input
              value={executorUserId}
              onChange={(e) => setExecutorUserId(e.target.value.trim())}
              placeholder="3"
            />
          </label>
          <label>
            executor_wallet
            <input
              value={executorWallet}
              onChange={(e) => setExecutorWallet(e.target.value.trim())}
              placeholder="G…"
            />
          </label>
          <label>
            payer_wallet (optional)
            <input
              value={payerWallet}
              onChange={(e) => setPayerWallet(e.target.value.trim())}
              placeholder="G…"
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
            {running ? 'running…' : 'run'}
          </button>
          {onOpenHarness ? (
            <button type="button" className="aj-ghost" onClick={onOpenHarness}>
              harness
            </button>
          ) : null}
          {onOpenWeek1 ? (
            <button type="button" className="aj-ghost" onClick={onOpenWeek1}>
              week1 only
            </button>
          ) : null}
        </div>

        {!hasKey ? (
          <p className="aj-hint">
            pegá una <code>axk_test_…</code>
          </p>
        ) : null}
        <p className="aj-hint">
          executor_user_id must exist in arcusx_users (default 3). executor_wallet = that user&apos;s
          G… . Release needs two Freighter signatures after fund (Edge v133).
        </p>
        <p className="aj-hint">
          Frozen SOW evidence:{' '}
          <a
            href="https://github.com/wrever/ArcusX/blob/v3.8.4/docs/sprints/instaawards-sow3/evidence/LIVE_E2E.md"
            target="_blank"
            rel="noreferrer"
          >
            LIVE_E2E.md
          </a>
          {' · '}
          <a
            href="https://github.com/wrever/ArcusX/blob/v3.8.4/docs/sprints/instaawards-sow3/REVIEWER_PACK.md"
            target="_blank"
            rel="noreferrer"
          >
            REVIEWER_PACK
          </a>
        </p>
        {error ? <pre className="aj-error">{error}</pre> : null}
        {log.length > 0 ? <pre className="aj-log">{log.join('\n')}</pre> : null}
      </section>
    </div>
  );
}

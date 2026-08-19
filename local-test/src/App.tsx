import { useState } from 'react';
import { ArcusXApiError } from '@arcusx/sdk';
import {
  createPartnerClient,
  gatewayHint,
  loadConfig,
  saveConfig,
  type LocalTestConfig,
} from './sdk';
import { runPartnerSuite, type SuiteReport } from './partnerSuite';
import {
  createFreighterAdapter,
  stellarExpertContractUrl,
  stellarExpertTxUrl,
} from './freighter';

type Tab = 'suite' | 'board' | 'quote' | 'escrow' | 'deals' | 'deal';

type RunState = {
  loading: boolean;
  label: string;
  result: unknown;
  error: string | null;
  ms: number | null;
};

type TaskRow = {
  id?: number;
  title?: string;
  price?: number;
  currency?: string;
  status?: string;
  category?: string;
};

type EscrowChainState = {
  unsignedXdr: string;
  contractId: string;
  expertUrl: string;
  deployTxUrl: string;
  releaseSteps: string[];
  lifecycleStep: string;
  escrowStatus: string;
};

function emptyChain(): EscrowChainState {
  return {
    unsignedXdr: '',
    contractId: '',
    expertUrl: '',
    deployTxUrl: '',
    releaseSteps: [],
    lifecycleStep: '',
    escrowStatus: '',
  };
}

function absorbEscrowResponse(res: unknown): Partial<EscrowChainState> & { escrowId?: string } {
  const r = (res ?? {}) as Record<string, unknown>;
  const escrow = (r.escrow ?? {}) as Record<string, unknown>;
  const contractId = String(r.contract_id ?? escrow.contract_id ?? '').trim();
  const expertUrl = String(
    r.stellar_expert_url ??
      escrow.stellar_expert_url ??
      (contractId ? stellarExpertContractUrl(contractId) : ''),
  );
  const deployTxHash = String(r.deploy_tx_hash ?? escrow.deploy_tx_hash ?? '').trim();
  const steps = Array.isArray(r.steps) ? (r.steps as Array<{ unsigned_xdr?: string }>) : [];
  return {
    escrowId: String(escrow.id ?? r.escrow_id ?? '').trim() || undefined,
    unsignedXdr: String(r.unsigned_xdr ?? '').trim(),
    contractId,
    expertUrl,
    deployTxUrl: String(
      r.deploy_tx_url ??
        escrow.deploy_tx_url ??
        (deployTxHash ? stellarExpertTxUrl(deployTxHash) : ''),
    ),
    releaseSteps: steps.map((s) => String(s.unsigned_xdr ?? '')).filter(Boolean),
    lifecycleStep: String(r.step ?? '').trim(),
    escrowStatus: String(escrow.status ?? '').trim(),
  };
}

function Action({
  title,
  hint,
  disabled,
  loading,
  onRun,
}: {
  title: string;
  hint?: string;
  disabled?: boolean;
  loading: boolean;
  onRun: () => void;
}) {
  return (
    <div className="action">
      <code>{title}</code>
      {hint ? <p className="hint">{hint}</p> : null}
      <button type="button" onClick={onRun} disabled={disabled || loading}>
        {loading ? '…' : 'Ejecutar'}
      </button>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<LocalTestConfig>(loadConfig);
  const [tab, setTab] = useState<Tab>('suite');
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nominal, setNominal] = useState('50');
  const [dealToken, setDealToken] = useState('');
  const [dealId, setDealId] = useState('');
  const [payeeWallet, setPayeeWallet] = useState(
    () => import.meta.env.VITE_TEST_WORKER_WALLET?.trim() || '',
  );
  const [dealTitle, setDealTitle] = useState('Pago seguro — local-test');
  const [clientWallet, setClientWallet] = useState(
    () => import.meta.env.VITE_TEST_CLIENT_WALLET?.trim() || '',
  );
  const [workerWallet, setWorkerWallet] = useState(
    () => import.meta.env.VITE_TEST_WORKER_WALLET?.trim() || '',
  );
  const [escrowId, setEscrowId] = useState('');
  const [chain, setChain] = useState<EscrowChainState>(emptyChain);
  const [freighterBusy, setFreighterBusy] = useState(false);
  const [suite, setSuite] = useState<SuiteReport | null>(null);
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [run, setRun] = useState<RunState>({
    loading: false,
    label: '',
    result: null,
    error: null,
    ms: null,
  });

  const hasKey = Boolean(config.apiKey.trim());

  function patch(partial: Partial<LocalTestConfig>) {
    const next = { ...config, ...partial };
    setConfig(next);
    saveConfig(next);
  }

  function applyChain(res: unknown) {
    const picked = absorbEscrowResponse(res);
    if (picked.escrowId) setEscrowId(picked.escrowId);
    setChain((prev) => ({
      unsignedXdr: picked.unsignedXdr || prev.unsignedXdr,
      contractId: picked.contractId || prev.contractId,
      expertUrl: picked.expertUrl || prev.expertUrl,
      deployTxUrl: picked.deployTxUrl || prev.deployTxUrl,
      releaseSteps: picked.releaseSteps?.length ? picked.releaseSteps : prev.releaseSteps,
      lifecycleStep: picked.lifecycleStep || prev.lifecycleStep,
      escrowStatus: picked.escrowStatus || prev.escrowStatus,
    }));
  }

  function ax() {
    return createPartnerClient(config);
  }

  async function connectFreighter() {
    setFreighterBusy(true);
    try {
      const wallet = createFreighterAdapter();
      const address = await wallet.getAddress();
      setClientWallet(address);
      setRun({
        loading: false,
        label: 'freighter.connect',
        result: { address, network: 'testnet', tip: 'Usa esta G… como client_wallet (pagador/firmante)' },
        error: null,
        ms: null,
      });
    } catch (e) {
      setRun({
        loading: false,
        label: 'freighter.connect',
        result: null,
        error: e instanceof Error ? e.message : String(e),
        ms: null,
      });
    } finally {
      setFreighterBusy(false);
    }
  }

  async function exec(label: string, fn: () => Promise<unknown>) {
    const t0 = performance.now();
    setRun({ loading: true, label, result: null, error: null, ms: null });
    try {
      const result = await fn();
      setRun({
        loading: false,
        label,
        result,
        error: null,
        ms: Math.round(performance.now() - t0),
      });
      return result;
    } catch (e) {
      let error: string;
      if (e instanceof ArcusXApiError) {
        error = JSON.stringify(
          {
            name: 'ArcusXApiError',
            status: e.status,
            code: e.code,
            message: e.message,
            requestId: e.requestId,
          },
          null,
          2,
        );
      } else {
        error = e instanceof Error ? e.message : String(e);
      }
      setRun({
        loading: false,
        label,
        result: null,
        error,
        ms: Math.round(performance.now() - t0),
      });
      return undefined;
    }
  }

  async function runSuite() {
    setSuiteRunning(true);
    setSuite(null);
    setRun({ loading: true, label: 'partner suite', result: null, error: null, ms: null });
    const t0 = performance.now();
    try {
      const client = ax();
      const report = await runPartnerSuite(client, {
        gatewayLabel: gatewayHint(config),
        apiKey: config.apiKey.trim(),
      });
      setSuite(report);
      setRun({
        loading: false,
        label: 'partner suite',
        result: report,
        error: report.failed > 0 ? `${report.failed} check(s) failed` : null,
        ms: Math.round(performance.now() - t0),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRun({
        loading: false,
        label: 'partner suite',
        result: null,
        error: msg,
        ms: Math.round(performance.now() - t0),
      });
    } finally {
      setSuiteRunning(false);
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>ArcusX SDK · local-test</h1>
        <p>
          Harness de integrador: API key → fee, board, quote, errores tipados, HMAC.
          Sin JWT ArcusX, sin Freighter. Wallet / evidencia on-chain = app del partner.
        </p>
        <div className="gateway">gateway → {gatewayHint(config)}</div>
      </header>

      <section className="panel">
        <h2>API key</h2>
        <div className="grid-creds">
          <label>
            axk_test_… / axk_live_…
            <input
              value={config.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
              placeholder="axk_test_…"
              autoComplete="off"
            />
          </label>
          <label>
            API URL (opcional — en DEV se usa proxy /partner-api → Edge)
            <input
              value={config.baseUrl}
              onChange={(e) => patch({ baseUrl: e.target.value })}
              placeholder="vacío = proxy local → Edge testnet"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="primary"
            disabled={!hasKey || suiteRunning || run.loading}
            onClick={() => void runSuite()}
          >
            {suiteRunning ? 'Corriendo suite…' : 'Correr suite partner (9 checks)'}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              localStorage.removeItem('arcusx-sdk-local-test-v2');
              setConfig(loadConfig());
              setSuite(null);
            }}
          >
            Limpiar
          </button>
          <span className="badge">{hasKey ? 'key ✓' : 'pega tu key'}</span>
          {suite && (
            <span className={suite.failed === 0 ? 'badge ok' : 'badge fail'}>
              {suite.passed}/{suite.passed + suite.failed} PASS
            </span>
          )}
        </div>
      </section>

      {suite && (
        <section className="panel">
          <h2>Suite results</h2>
          <p className="hint">
            {suite.startedAt} · {suite.gateway} · {suite.passed} ok · {suite.failed} fail
          </p>
          <ul className="suite-list">
            {suite.checks.map((c) => (
              <li key={c.id} className={c.pass ? 'pass' : 'fail'}>
                <span className="mark">{c.pass ? 'PASS' : 'FAIL'}</span>
                <span className="label">{c.label}</span>
                <span className="detail">{c.detail}</span>
                <span className="ms">{c.ms}ms</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h2>Explorar (manual)</h2>
        <div className="tabs">
          {(
            [
              ['suite', 'Suite'],
              ['board', 'Board / tasks'],
              ['quote', 'Fee quote'],
              ['escrow', 'Partner escrow'],
              ['deals', 'Partner deals'],
              ['deal', 'Deal preview'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'suite' && (
          <p className="hint" style={{ marginTop: '0.75rem' }}>
            Usa el botón verde de arriba. Checks: fee 0.02 · market stats · getTasks ·
            escrow.quote · quote inválido · API key inválida · HMAC · partnerEscrow.list ·
            partnerDeals.create+getByToken. Firma on-chain = app del partner (no aquí).
          </p>
        )}

        {tab === 'board' && (
          <>
            <div className="actions">
              <Action
                title="public.getPlatformFee"
                loading={run.loading}
                disabled={!hasKey}
                onRun={() =>
                  void exec('public.getPlatformFee', () => ax().public.getPlatformFee())
                }
              />
              <Action
                title="public.getMarketStats"
                loading={run.loading}
                disabled={!hasKey}
                onRun={() =>
                  void exec('public.getMarketStats', () => ax().public.getMarketStats())
                }
              />
              <Action
                title="public.getTasks"
                hint="Lista abierta para mostrar en tu UI"
                loading={run.loading}
                disabled={!hasKey}
                onRun={() =>
                  void exec('public.getTasks', async () => {
                    const list = await ax().public.getTasks({ sort_by: 'date_desc' });
                    const rows = Array.isArray(list) ? (list as TaskRow[]) : [];
                    setTasks(rows);
                    return { count: rows.length, tasks: rows.slice(0, 20) };
                  })
                }
              />
            </div>
            {tasks.length > 0 && (
              <div style={{ marginTop: '0.85rem' }}>
                <p className="hint">Selecciona una task (precio → quote):</p>
                <div className="task-list">
                  {tasks.slice(0, 12).map((t) => {
                    const id = Number(t.id);
                    const active = selectedId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={active ? 'task-row active' : 'task-row'}
                        onClick={() => {
                          setSelectedId(id);
                          if (t.price != null) setNominal(String(t.price));
                        }}
                      >
                        <span>#{id}</span>
                        <span className="task-title">{t.title ?? '—'}</span>
                        <span>
                          {t.price ?? '—'} {t.currency ?? 'USDC'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'quote' && (
          <>
            <div className="fields" style={{ marginTop: '0.75rem' }}>
              <label>
                Nominal USDC
                <input value={nominal} onChange={(e) => setNominal(e.target.value)} />
              </label>
            </div>
            <div className="actions">
              <Action
                title="escrow.quote(nominal)"
                hint="No hardcodees el % — siempre quote desde API"
                loading={run.loading}
                disabled={!hasKey}
                onRun={() =>
                  void exec('escrow.quote', () =>
                    ax().escrow.quote(Number(nominal) || 50),
                  )
                }
              />
            </div>
          </>
        )}

        {tab === 'escrow' && (
          <>
            <p className="hint" style={{ marginTop: '0.75rem' }}>
              Flujo Testnet (solo Freighter del <strong>cliente</strong>): deploy → fund →
              prepareRelease×3 (complete → approve → release). Worker solo recibe USDC
              (trustline Testnet).
            </p>
            <div className="row" style={{ marginTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary"
                disabled={freighterBusy || run.loading}
                onClick={() => void connectFreighter()}
              >
                {freighterBusy ? 'Freighter…' : 'Conectar Freighter → client_wallet'}
              </button>
              {chain.contractId ? (
                <a
                  className="badge ok"
                  href={chain.expertUrl || stellarExpertContractUrl(chain.contractId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Expert · {chain.contractId.slice(0, 8)}…
                </a>
              ) : (
                <span className="badge">contract_id tras firmar deploy</span>
              )}
              {chain.deployTxUrl ? (
                <a className="badge ok" href={chain.deployTxUrl} target="_blank" rel="noreferrer">
                  tx deploy
                </a>
              ) : null}
              {chain.escrowStatus ? (
                <span className={chain.escrowStatus === 'released' ? 'badge ok' : 'badge'}>
                  status: {chain.escrowStatus}
                </span>
              ) : null}
              {chain.lifecycleStep ? (
                <span className="badge">last step: {chain.lifecycleStep}</span>
              ) : null}
            </div>
            {chain.escrowStatus === 'funded' && chain.lifecycleStep.includes('complete') ? (
              <p className="hint" style={{ marginTop: '0.5rem', color: 'var(--accent)' }}>
                Milestone marked COMPLETED — USDC still locked in contract. Run{' '}
                <strong>5 · prepareRelease</strong> again → sign <strong>approve</strong>, then again
                → sign <strong>release</strong>. Only then worker receives USDC.
              </p>
            ) : null}
            {chain.escrowStatus === 'released' ? (
              <p className="hint" style={{ marginTop: '0.5rem', color: 'var(--accent)' }}>
                Released — worker should see USDC (~workerNet after 2% fee). Check Freighter /
                Expert account GA7U…
              </p>
            ) : null}
            <div className="fields" style={{ marginTop: '0.75rem' }}>
              <label>
                client_wallet (G… firmante Freighter)
                <input
                  value={clientWallet}
                  onChange={(e) => setClientWallet(e.target.value.trim())}
                  placeholder="G… pagador"
                />
              </label>
              <label>
                worker_wallet (G…)
                <input
                  value={workerWallet}
                  onChange={(e) => setWorkerWallet(e.target.value.trim())}
                  placeholder="G… receptor"
                />
              </label>
              <label>
                amount USDC
                <input value={nominal} onChange={(e) => setNominal(e.target.value)} />
              </label>
              <label>
                escrow_id
                <input
                  value={escrowId}
                  onChange={(e) => setEscrowId(e.target.value.trim())}
                  placeholder="uuid"
                />
              </label>
              <label>
                contract_id (C…)
                <input
                  value={chain.contractId}
                  onChange={(e) =>
                    setChain((c) => ({
                      ...c,
                      contractId: e.target.value.trim(),
                      expertUrl: e.target.value.trim().startsWith('C')
                        ? stellarExpertContractUrl(e.target.value.trim())
                        : c.expertUrl,
                    }))
                  }
                  placeholder="aparece tras confirmDeploy"
                  readOnly={!chain.contractId}
                />
              </label>
            </div>
            <div className="actions">
              <Action
                title="1 · prepareDeploy"
                hint="Devuelve unsigned_xdr (contract_id aún null)"
                loading={run.loading}
                disabled={
                  !hasKey ||
                  !clientWallet.startsWith('G') ||
                  !workerWallet.startsWith('G')
                }
                onRun={() =>
                  void exec('partnerEscrow.prepareDeploy', async () => {
                    setChain(emptyChain());
                    const res = await ax().partnerEscrow.prepareDeploy({
                      clientWallet,
                      workerWallet,
                      amountUsdc: Number(nominal) || 50,
                      externalId: `local-test-${Date.now()}`,
                      title: 'local-test partner escrow',
                    });
                    applyChain(res);
                    return res;
                  })
                }
              />
              <Action
                title="2 · Firmar deploy (Freighter)"
                hint="Abre Freighter → confirmDeploy → contract_id + Expert"
                loading={run.loading || freighterBusy}
                disabled={!hasKey || !escrowId || !chain.unsignedXdr}
                onRun={() =>
                  void exec('freighter.sign → confirmDeploy', async () => {
                    const wallet = createFreighterAdapter();
                    const address = await wallet.getAddress();
                    if (address !== clientWallet) {
                      throw new Error(
                        `Freighter=${address.slice(0, 8)}… ≠ client_wallet. Conectá la wallet pagadora.`,
                      );
                    }
                    const signed = await wallet.signTransaction(chain.unsignedXdr);
                    const res = await ax().partnerEscrow.confirmDeploy(escrowId, {
                      signedXdr: signed,
                      contractId: chain.contractId || undefined,
                    });
                    applyChain(res);
                    setChain((c) => ({ ...c, unsignedXdr: '' }));
                    return res;
                  })
                }
              />
              <Action
                title="3 · prepareFund"
                hint="Requiere contract_id (tras paso 2)"
                loading={run.loading}
                disabled={
                  !hasKey || !escrowId || !clientWallet.startsWith('G') || !chain.contractId
                }
                onRun={() =>
                  void exec('partnerEscrow.prepareFund', async () => {
                    const res = await ax().partnerEscrow.prepareFund(escrowId, clientWallet);
                    applyChain(res);
                    return res;
                  })
                }
              />
              <Action
                title="4 · Firmar fund (Freighter)"
                loading={run.loading || freighterBusy}
                disabled={!hasKey || !escrowId || !chain.unsignedXdr || !chain.contractId}
                onRun={() =>
                  void exec('freighter.sign → confirmFund', async () => {
                    const wallet = createFreighterAdapter();
                    const signed = await wallet.signTransaction(chain.unsignedXdr);
                    const res = await ax().partnerEscrow.confirmFund(escrowId, {
                      signedXdr: signed,
                      contractId: chain.contractId,
                    });
                    applyChain(res);
                    setChain((c) => ({ ...c, unsignedXdr: '' }));
                    return res;
                  })
                }
              />
              <Action
                title="5 · prepareRelease (next step)"
                hint="1 paso por vez: complete → approve → release (todo firma client)"
                loading={run.loading}
                disabled={
                  !hasKey || !escrowId || !clientWallet.startsWith('G') || !chain.contractId
                }
                onRun={() =>
                  void exec('partnerEscrow.prepareRelease', async () => {
                    const res = await ax().partnerEscrow.prepareRelease(
                      escrowId,
                      clientWallet,
                    );
                    applyChain(res);
                    return res;
                  })
                }
              />
              <Action
                title="6 · Firmar paso (Freighter client)"
                hint="Siempre client_wallet — no hace falta cambiar a worker"
                loading={run.loading || freighterBusy}
                disabled={
                  !hasKey ||
                  !escrowId ||
                  !(chain.releaseSteps.length > 0 || chain.unsignedXdr)
                }
                onRun={() =>
                  void exec('freighter.sign → confirmRelease', async () => {
                    const last = run.result as {
                      step?: string;
                      signer_wallet?: string;
                    } | null;
                    const step = String(last?.step ?? 'release');
                    const expectedSigner = String(last?.signer_wallet || clientWallet);
                    const wallet = createFreighterAdapter();
                    const address = await wallet.getAddress();
                    if (expectedSigner.startsWith('G') && address !== expectedSigner) {
                      throw new Error(
                        `Freighter=${address.slice(0, 10)}… debe ser client ${expectedSigner.slice(0, 10)}…`,
                      );
                    }
                    const xdrs =
                      chain.releaseSteps.length > 0
                        ? chain.releaseSteps
                        : [chain.unsignedXdr];
                    const signed: string[] = [];
                    for (const xdr of xdrs) {
                      signed.push(await wallet.signTransaction(xdr));
                    }
                    const res = await ax().partnerEscrow.confirmRelease(escrowId, {
                      signedXdr: signed,
                      step,
                    });
                    applyChain(res);
                    setChain((c) => ({ ...c, unsignedXdr: '', releaseSteps: [] }));
                    return res;
                  })
                }
              />
              <Action
                title="partnerEscrow.get"
                loading={run.loading}
                disabled={!hasKey || !escrowId}
                onRun={() =>
                  void exec('partnerEscrow.get', async () => {
                    const res = await ax().partnerEscrow.get(escrowId);
                    applyChain(res);
                    return res;
                  })
                }
              />
              <Action
                title="partnerEscrow.list"
                loading={run.loading}
                disabled={!hasKey}
                onRun={() =>
                  void exec('partnerEscrow.list', () => ax().partnerEscrow.list())
                }
              />
            </div>
          </>
        )}

        {tab === 'deals' && (
          <>
            <p className="hint" style={{ marginTop: '0.75rem' }}>
              Payment link Testnet: API key → create → <code>deal_token</code> → prepareFund
              (devuelve XDR deploy). Confirm/fund on-chain = wallet en tu app.
            </p>
            <div className="fields" style={{ marginTop: '0.75rem' }}>
              <label>
                payee_wallet (G…)
                <input
                  value={payeeWallet}
                  onChange={(e) => setPayeeWallet(e.target.value.trim())}
                  placeholder="G… quien cobra"
                />
              </label>
              <label>
                payer_wallet / client (G…)
                <input
                  value={clientWallet}
                  onChange={(e) => setClientWallet(e.target.value.trim())}
                  placeholder="G… quien paga"
                />
              </label>
              <label>
                title
                <input value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
              </label>
              <label>
                amount USDC
                <input value={nominal} onChange={(e) => setNominal(e.target.value)} />
              </label>
              <label>
                deal_id
                <input
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value.trim())}
                  placeholder="uuid tras create"
                />
              </label>
              <label>
                deal_token
                <input
                  value={dealToken}
                  onChange={(e) => setDealToken(e.target.value.trim())}
                  placeholder="tras create"
                />
              </label>
            </div>
            <div className="actions">
              <Action
                title="partnerDeals.create"
                hint="Genera link / token (Edge /v1/partner/deals)"
                loading={run.loading}
                disabled={!hasKey || !payeeWallet.startsWith('G') || !dealTitle.trim()}
                onRun={() =>
                  void exec('partnerDeals.create', async () => {
                    const res = await ax().partnerDeals.create({
                      amountUsdc: Number(nominal) || 50,
                      payeeWallet,
                      payerWallet: clientWallet.startsWith('G') ? clientWallet : undefined,
                      title: dealTitle,
                      externalId: `local-deal-${Date.now()}`,
                    });
                    const token = String(
                      (res as { deal_token?: string; deal?: { deal_token?: string } })?.deal_token ??
                        (res as { deal?: { deal_token?: string } })?.deal?.deal_token ??
                        '',
                    );
                    const id = String(
                      (res as { deal_id?: string; deal?: { id?: string } })?.deal_id ??
                        (res as { deal?: { id?: string } })?.deal?.id ??
                        '',
                    );
                    if (token) setDealToken(token);
                    if (id) setDealId(id);
                    return res;
                  })
                }
              />
              <Action
                title="partnerDeals.getByToken"
                loading={run.loading}
                disabled={!hasKey || !dealToken}
                onRun={() =>
                  void exec('partnerDeals.getByToken', () =>
                    ax().partnerDeals.getByToken(dealToken),
                  )
                }
              />
              <Action
                title="partnerDeals.prepareFund"
                hint="Sin escrow → step=deploy + unsigned_xdr (wallets con USDC trustline)"
                loading={run.loading}
                disabled={!hasKey || !dealId || !clientWallet.startsWith('G')}
                onRun={() =>
                  void exec('partnerDeals.prepareFund', async () => {
                    const res = await ax().partnerDeals.prepareFund(dealId, clientWallet);
                    const esc = String(
                      (res as { escrow_id?: string; escrow?: { id?: string } })?.escrow_id ??
                        (res as { escrow?: { id?: string } })?.escrow?.id ??
                        '',
                    );
                    if (esc) setEscrowId(esc);
                    return res;
                  })
                }
              />
              <Action
                title="partnerDeals.list"
                loading={run.loading}
                disabled={!hasKey}
                onRun={() =>
                  void exec('partnerDeals.list', () => ax().partnerDeals.list())
                }
              />
            </div>
          </>
        )}

        {tab === 'deal' && (
          <>
            <div className="fields" style={{ marginTop: '0.75rem' }}>
              <label>
                deal_token
                <input
                  value={dealToken}
                  onChange={(e) => setDealToken(e.target.value.trim())}
                  placeholder="token de un payment link"
                />
              </label>
            </div>
            <div className="actions">
              <Action
                title="deals.getByToken"
                hint="Preview público / partner de un link de pago"
                loading={run.loading}
                disabled={!hasKey || !dealToken}
                onRun={() =>
                  void exec('deals.getByToken', () => ax().deals.getByToken(dealToken))
                }
              />
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Último resultado JSON</h2>
        <div className="meta">
          <span>
            last: <strong>{run.label || '—'}</strong>
          </span>
          <span>
            ms: <strong>{run.ms ?? '—'}</strong>
          </span>
          <span>{run.loading || suiteRunning ? 'running…' : 'idle'}</span>
        </div>
        {run.error && !suite ? (
          <pre className="log error">{run.error}</pre>
        ) : (
          <pre className="log">
            {run.result != null ? JSON.stringify(run.result, null, 2) : '—'}
          </pre>
        )}
      </section>
    </div>
  );
}

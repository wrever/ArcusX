import { useCallback, useMemo, useState } from 'react';
import { ArcusXApiError } from '@arcusx/sdk';
import {
  createClient,
  loadConfig,
  saveConfig,
  gatewayLabel,
  type PlaygroundConfig,
} from './sdkClient';
import { runPartnerSuite, type SuiteReport } from './partnerSuite';

type Tab = 'suite' | 'public' | 'marketplace' | 'private' | 'deals' | 'escrow' | 'settlement' | 'disputes' | 'evidence' | 'ratings' | 'trust' | 'rail' | 'webhooks' | 'award';

type RunState = {
  loading: boolean;
  label: string;
  result: unknown;
  error: string | null;
  ms: number | null;
};

const TABS: { id: Tab; label: string; auth?: string }[] = [
  { id: 'suite', label: 'suite' },
  { id: 'public', label: 'public' },
  { id: 'marketplace', label: 'marketplace', auth: 'JWT + userId' },
  { id: 'private', label: 'private', auth: 'JWT' },
  { id: 'deals', label: 'deals', auth: 'JWT' },
  { id: 'escrow', label: 'escrow', auth: 'JWT' },
  { id: 'settlement', label: 'settlement', auth: 'JWT + tx' },
  { id: 'disputes', label: 'disputes', auth: 'JWT' },
  { id: 'evidence', label: 'evidence', auth: 'JWT' },
  { id: 'ratings', label: 'ratings', auth: 'JWT' },
  { id: 'trust', label: 'trust', auth: 'JWT' },
  { id: 'award', label: 'award→ready', auth: 'JWT' },
  { id: 'rail', label: 'rail E2E', auth: 'JWT + wallet' },
  { id: 'webhooks', label: 'webhooks' },
];

function ActionCard({
  title,
  hint,
  needsAuth,
  authBadge = 'JWT',
  hasAuth,
  onRun,
  loading,
}: {
  title: string;
  hint?: string;
  needsAuth?: boolean;
  authBadge?: string;
  hasAuth: boolean;
  onRun: () => void;
  loading: boolean;
}) {
  const disabled = loading || (needsAuth && !hasAuth);
  return (
    <div className="action-card">
      <div className="action-card-head">
        <code>{title}</code>
        {needsAuth && <span className="badge">{authBadge}</span>}
      </div>
      {hint && <p className="hint">{hint}</p>}
      <button type="button" onClick={onRun} disabled={disabled}>
        {loading ? '…' : 'Ejecutar'}
      </button>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<PlaygroundConfig>(loadConfig);
  const [tab, setTab] = useState<Tab>('suite');
  const [taskId, setTaskId] = useState('1');
  const [dealToken, setDealToken] = useState('');
  const [dealId, setDealId] = useState('');
  const [disputeReason, setDisputeReason] = useState('Prueba disputa SDK playground — entrega incompleta.');
  const [nominalQuote, setNominalQuote] = useState('100');
  const [proposalId, setProposalId] = useState('1');
  const [clientWallet, setClientWallet] = useState('');
  const [contractId, setContractId] = useState('');
  const [deployTxHash, setDeployTxHash] = useState('');
  const [fundTxHash, setFundTxHash] = useState('');
  const [releaseTxHash, setReleaseTxHash] = useState('');
  const [suite, setSuite] = useState<SuiteReport | null>(null);
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [run, setRun] = useState<RunState>({
    loading: false,
    label: '',
    result: null,
    error: null,
    ms: null,
  });

  const hasJwt = Boolean(config.bearerToken.trim());
  const userId = Number(config.userId) || 0;
  const hasUser = hasJwt && userId > 0;

  const persist = useCallback((next: PlaygroundConfig) => {
    setConfig(next);
    saveConfig(next);
  }, []);

  const exec = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setRun({ loading: true, label, result: null, error: null, ms: null });
    const t0 = performance.now();
    try {
      const result = await fn();
      setRun({
        loading: false,
        label,
        result,
        error: null,
        ms: Math.round(performance.now() - t0),
      });
    } catch (e) {
      let msg = String(e);
      if (e instanceof ArcusXApiError) {
        msg = `[${e.code}] ${e.message} (HTTP ${e.status})`;
      }
      setRun({
        loading: false,
        label,
        result: e instanceof ArcusXApiError ? e.raw : null,
        error: msg,
        ms: Math.round(performance.now() - t0),
      });
    }
  }, [config]);

  const runSuite = useCallback(async () => {
    setSuiteRunning(true);
    setSuite(null);
    setRun({ loading: true, label: 'partner suite', result: null, error: null, ms: null });
    const t0 = performance.now();
    try {
      const client = createClient(config);
      const report = await runPartnerSuite(client, { gatewayLabel: gatewayLabel(config) });
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
  }, [config]);

  const ax = useMemo(() => {
    try {
      return createClient(config);
    } catch {
      return null;
    }
  }, [config]);

  const update = (key: keyof PlaygroundConfig, value: string | boolean) => {
    persist({ ...config, [key]: value });
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <header className="brand">
          <span className="logo">AX</span>
          <div>
            <h1>SDK Playground</h1>
            <p>Integrador externo · @arcusx/sdk · suite partner (API key)</p>
          </div>
        </header>

        <section className="panel">
          <h2>Conexión</h2>
          <label>
            API URL (opcional)
            <input
              value={config.baseUrl}
              onChange={(e) => update('baseUrl', e.target.value)}
              placeholder="vacío = https://api.arcusx.pro"
            />
          </label>
          <label>
            Supabase anon key (solo Edge directo)
            <input
              type="password"
              value={config.supabaseAnonKey}
              onChange={(e) => update('supabaseAnonKey', e.target.value)}
              placeholder="partners: dejar vacío"
            />
          </label>
          <label>
            Partner API key
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => update('apiKey', e.target.value)}
              placeholder="axk_test_…"
            />
          </label>
          <label>
            User JWT
            <textarea
              rows={3}
              value={config.bearerToken}
              onChange={(e) => update('bearerToken', e.target.value)}
              placeholder="Tras OAuth + sync_supabase_user"
            />
          </label>
          <label>
            User ID (numérico)
            <input
              value={config.userId}
              onChange={(e) => update('userId', e.target.value)}
              placeholder="13"
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={config.useLegacyActions}
              onChange={(e) => update('useLegacyActions', e.target.checked)}
            />
            Legacy <code>?action=</code>
          </label>
        </section>

        <section className="panel status">
          <div className={ax ? 'dot ok' : 'dot err'} />
          <span>{ax ? 'Cliente listo' : 'Falta API key o JWT'}</span>
          <span className="chip">{gatewayLabel(config).replace(/^https?:\/\//, '')}</span>
          {config.apiKey && <span className="chip">partner key</span>}
          {hasJwt && <span className="chip">JWT</span>}
        </section>
      </aside>

      <main className="main">
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.auth && <small>{t.auth}</small>}
            </button>
          ))}
        </nav>

        <div className="inputs-row">
          <label>
            taskId
            <input value={taskId} onChange={(e) => setTaskId(e.target.value)} />
          </label>
          <label>
            dealToken
            <input value={dealToken} onChange={(e) => setDealToken(e.target.value)} />
          </label>
          <label>
            dealId (UUID)
            <input value={dealId} onChange={(e) => setDealId(e.target.value)} />
          </label>
          <label>
            nominal USDC (quote)
            <input value={nominalQuote} onChange={(e) => setNominalQuote(e.target.value)} />
          </label>
          <label>
            proposalId
            <input value={proposalId} onChange={(e) => setProposalId(e.target.value)} />
          </label>
          <label>
            clientWallet (G…)
            <input value={clientWallet} onChange={(e) => setClientWallet(e.target.value)} placeholder="G…56 chars" />
          </label>
          <label>
            contractId (C…)
            <input value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="C…" />
          </label>
          <label>
            deployTxHash
            <input value={deployTxHash} onChange={(e) => setDeployTxHash(e.target.value)} />
          </label>
          <label>
            fundTxHash
            <input value={fundTxHash} onChange={(e) => setFundTxHash(e.target.value)} />
          </label>
          <label>
            releaseTxHash
            <input value={releaseTxHash} onChange={(e) => setReleaseTxHash(e.target.value)} />
          </label>
        </div>

        {tab === 'disputes' && (
          <label className="dispute-reason">
            motivo disputa
            <textarea rows={2} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
          </label>
        )}

        <div className="actions-grid">
          {tab === 'suite' && (
            <>
              <ActionCard
                title="Correr suite partner (7 checks)"
                hint="fee · stats · tasks · quote · quote 400 · key 401 · HMAC — sin JWT ni wallet"
                onRun={() => void runSuite()}
                loading={run.loading || suiteRunning}
                hasAuth={Boolean(config.apiKey.trim())}
                needsAuth
                authBadge="API key"
              />
              {suite && (
                <div className="suite-panel">
                  <p className="hint">
                    {suite.passed}/{suite.passed + suite.failed} PASS · {suite.gateway}
                  </p>
                  <ul className="suite-list">
                    {suite.checks.map((c) => (
                      <li key={c.id} className={c.pass ? 'pass' : 'fail'}>
                        <span className="mark">{c.pass ? 'PASS' : 'FAIL'}</span>
                        <span>{c.label}</span>
                        <span className="detail">{c.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {tab === 'public' && (
            <>
              <ActionCard
                title="public.getPlatformFee()"
                onRun={() => exec('getPlatformFee', () => createClient(config).public.getPlatformFee())}
                loading={run.loading}
                hasAuth={hasJwt}
              />
              <ActionCard
                title="public.getMarketStats()"
                onRun={() => exec('getMarketStats', () => createClient(config).public.getMarketStats())}
                loading={run.loading}
                hasAuth={hasJwt}
              />
              <ActionCard
                title="public.getTasks()"
                hint="Listado marketplace abierto"
                onRun={() => exec('getTasks', () => createClient(config).public.getTasks({ sort_by: 'date_desc' }))}
                loading={run.loading}
                hasAuth={hasJwt}
              />
            </>
          )}

          {tab === 'marketplace' && (
            <>
              <ActionCard
                title="marketplace.listMine()"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('listMine', () => createClient(config).marketplace.listMine())}
                loading={run.loading}
              />
              <ActionCard
                title="marketplace.get(taskId)"
                onRun={() => exec('get', () => createClient(config).marketplace.get(Number(taskId)))}
                loading={run.loading}
                hasAuth={hasJwt}
              />
              <ActionCard
                title="marketplace.getProposals(taskId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('getProposals', () => createClient(config).marketplace.getProposals(Number(taskId)))}
                loading={run.loading}
              />
              <ActionCard
                title="marketplace.create()"
                hint="Crea tarea demo con external_id único"
                needsAuth
                hasAuth={hasUser}
                onRun={() => exec('create', () => createClient(config).marketplace.create({
                  user_id: userId,
                  title: `SDK playground ${new Date().toISOString().slice(11, 19)}`,
                  description: 'Tarea de prueba desde sdk-playground',
                  price: 10,
                  currency: 'USDC',
                  category: 'Desarrollo',
                  difficulty: 'Fácil',
                  external_id: `playground-${Date.now()}`,
                }, { idempotencyKey: `pg-${Date.now()}` }))}
                loading={run.loading}
              />
            </>
          )}

          {tab === 'private' && (
            <>
              <ActionCard
                title="private.list()"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('private.list', () => createClient(config).private.list())}
                loading={run.loading}
              />
              <ActionCard
                title="private.accept(taskId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('private.accept', () => createClient(config).private.accept(Number(taskId)))}
                loading={run.loading}
              />
              <ActionCard
                title="private.reject(taskId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('private.reject', () => createClient(config).private.reject(Number(taskId), 'playground reject'))}
                loading={run.loading}
              />
            </>
          )}

          {tab === 'deals' && (
            <>
              <ActionCard
                title="deals.list()"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('deals.list', () => createClient(config).deals.list())}
                loading={run.loading}
              />
              <ActionCard
                title="deals.getByToken(dealToken)"
                onRun={() => exec('getByToken', () => createClient(config).deals.getByToken(dealToken))}
                loading={run.loading}
                hasAuth={hasJwt}
                hint="Pega un deal_token UUID"
              />
              <ActionCard
                title="deals.get(dealId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('deals.get', () => createClient(config).deals.get(dealId))}
                loading={run.loading}
              />
            </>
          )}

          {tab === 'escrow' && (
            <>
              <ActionCard
                title="escrow.quote(nominal)"
                onRun={() => exec('escrow.quote', () => createClient(config).escrow.quote(Number(nominalQuote)))}
                loading={run.loading}
                hasAuth={hasJwt}
                hint="Fee bilateral — TW oculto"
              />
              <ActionCard
                title="escrow.status(taskId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('escrow.status', () => createClient(config).escrow.status(Number(taskId)))}
                loading={run.loading}
              />
              <ActionCard
                title="escrow.createForTask(taskId, proposalId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('createForTask', () => createClient(config).escrow.createForTask(Number(taskId), Number(proposalId)))}
                loading={run.loading}
              />
              <ActionCard
                title="escrow.markWorkStarted(taskId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('markWorkStarted', () => createClient(config).escrow.markWorkStarted(Number(taskId)))}
                loading={run.loading}
              />
            </>
          )}

          {tab === 'disputes' && (
            <>
              <ActionCard
                title="disputes.list()"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('disputes.list', () => createClient(config).disputes.list())}
                loading={run.loading}
              />
              <ActionCard
                title="disputes.create(taskId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('disputes.create', () => createClient(config).disputes.create({
                  task_id: Number(taskId),
                  reason: disputeReason,
                }))}
                loading={run.loading}
              />
              <ActionCard
                title="disputes.getChatByTask(taskId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('getChatByTask', () => createClient(config).disputes.getChatByTask(Number(taskId)))}
                loading={run.loading}
              />
              <ActionCard
                title="disputes.getTimelineByTask(taskId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('getTimelineByTask', () => createClient(config).disputes.getTimelineByTask(Number(taskId)))}
                loading={run.loading}
              />
            </>
          )}

          {tab === 'evidence' && (
            <>
              <ActionCard
                title="evidence.getMilestone(taskId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('getMilestone', () => createClient(config).evidence.getMilestone(Number(taskId)))}
                loading={run.loading}
              />
              <ActionCard
                title="evidence.getDeal(dealId)"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('getDealEvidence', () => createClient(config).evidence.getDeal(dealId))}
                loading={run.loading}
              />
            </>
          )}

          {tab === 'ratings' && (
            <>
              <ActionCard
                title="ratings.getUserSummary(userId)"
                onRun={() => exec('getUserSummary', () => createClient(config).ratings.getUserSummary(userId || 1))}
                loading={run.loading}
                hasAuth={hasJwt}
              />
            </>
          )}

          {tab === 'trust' && (
            <>
              <ActionCard
                title="trust.registerWallet()"
                hint="Requiere wallet G… en body"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('registerWallet', () => createClient(config).trust.registerWallet({
                  wallet_address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
                }))}
                loading={run.loading}
              />
            </>
          )}

          {tab === 'award' && (
            <>
              <p className="hint" style={{ gridColumn: '1 / -1', margin: 0, opacity: 0.75, fontSize: '0.85rem' }}>
                Flujo Week 2→3 con un JWT (cliente): create → (apply requiere otro user) → select → quote → createForTask → status.
                Dual JWT completo: <code>examples/sdk-node-award</code>.
              </p>
              <ActionCard
                title="① marketplace.create"
                needsAuth
                hasAuth={hasUser}
                onRun={() =>
                  exec('award.create', async () => {
                    const created = await createClient(config).marketplace.create(
                      {
                        user_id: userId,
                        title: 'Playground award microtask',
                        description: 'SOW2 W3 playground: work object → escrow-ready',
                        price: Number(nominalQuote) || 50,
                        currency: 'USDC',
                        category: 'Desarrollo',
                        difficulty: 'Intermedio',
                        external_id: `playground-award-${Date.now()}`,
                      },
                      { idempotencyKey: `pg-award-${Date.now()}` },
                    );
                    if (created?.task_id) setTaskId(String(created.task_id));
                    return created;
                  })
                }
                loading={run.loading}
              />
              <ActionCard
                title="② marketplace.getProposals + select"
                needsAuth
                hasAuth={hasJwt && Boolean(taskId)}
                onRun={() =>
                  exec('award.select', async () => {
                    const list = await createClient(config).marketplace.getProposals(Number(taskId));
                    const first = Array.isArray(list) ? list[0] : null;
                    if (!first?.id) throw new Error('Sin proposals — apply desde otro JWT (sdk-node-award)');
                    setProposalId(String(first.id));
                    return createClient(config).marketplace.selectProposal(Number(taskId), Number(first.id));
                  })
                }
                loading={run.loading}
              />
              <ActionCard
                title="③ escrow.quote + createForTask + status"
                needsAuth
                hasAuth={hasJwt && Boolean(taskId) && Boolean(proposalId)}
                onRun={() =>
                  exec('award.escrowReady', async () => {
                    const client = createClient(config);
                    const quote = await client.escrow.quote(Number(nominalQuote) || 50);
                    const created = await client.escrow.createForTask(Number(taskId), Number(proposalId));
                    const status = await client.escrow.status(Number(taskId));
                    return { quote, created, status };
                  })
                }
                loading={run.loading}
              />
            </>
          )}

          {tab === 'rail' && (
            <>
              <ActionCard
                title="① escrow.quote(nominal)"
                onRun={() => exec('quote', () => createClient(config).escrow.quote(Number(nominalQuote)))}
                loading={run.loading}
                hasAuth={hasJwt}
              />
              <ActionCard
                title="② escrow.prepareDeploy()"
                hint="Requiere clientWallet G… + JWT"
                needsAuth
                hasAuth={hasJwt && clientWallet.startsWith('G')}
                onRun={() => exec('prepareDeploy', () => createClient(config).escrow.prepareDeploy(
                  Number(taskId), Number(proposalId), clientWallet,
                ))}
                loading={run.loading}
              />
              <ActionCard
                title="③ escrow.prepareFund()"
                needsAuth
                hasAuth={hasJwt && clientWallet.startsWith('G')}
                onRun={() => exec('prepareFund', () => createClient(config).escrow.prepareFund(
                  Number(taskId), clientWallet,
                ))}
                loading={run.loading}
              />
              <ActionCard
                title="④ escrow.prepareRelease()"
                needsAuth
                hasAuth={hasJwt && clientWallet.startsWith('G')}
                onRun={() => exec('prepareRelease', () => createClient(config).escrow.prepareRelease(
                  Number(taskId), clientWallet,
                ))}
                loading={run.loading}
              />
              <ActionCard
                title="⑤ escrow.status (bounded ×1)"
                needsAuth
                hasAuth={hasJwt && Boolean(taskId)}
                onRun={() => exec('status', () => createClient(config).escrow.status(Number(taskId)))}
                loading={run.loading}
              />
              <ActionCard
                title="⑥ confirmDeploy (tx or after sign)"
                needsAuth
                hasAuth={hasJwt && Boolean(taskId) && Boolean(proposalId) && Boolean(deployTxHash || contractId)}
                onRun={() =>
                  exec('confirmDeploy', () =>
                    createClient(config).escrow.confirmDeploy(Number(taskId), {
                      proposalId: Number(proposalId),
                      deployTxHash: deployTxHash || undefined,
                      contractId: contractId || undefined,
                      clientWallet: clientWallet || undefined,
                    }),
                  )
                }
                loading={run.loading}
              />
              <ActionCard
                title="⑦ confirmFund"
                needsAuth
                hasAuth={hasJwt && Boolean(taskId) && Boolean(contractId) && Boolean(fundTxHash)}
                onRun={() =>
                  exec('confirmFund', () =>
                    createClient(config).escrow.confirmFund(Number(taskId), {
                      proposalId: Number(proposalId),
                      contractId,
                      fundTxHash,
                      clientWallet: clientWallet || undefined,
                    }),
                  )
                }
                loading={run.loading}
              />
              <ActionCard
                title="⑧ confirmRelease"
                needsAuth
                hasAuth={hasJwt && Boolean(taskId) && Boolean(releaseTxHash)}
                onRun={() =>
                  exec('confirmRelease', () =>
                    createClient(config).escrow.confirmRelease(Number(taskId), releaseTxHash),
                  )
                }
                loading={run.loading}
              />
              <ActionCard
                title="webhooks.listDeliveries()"
                needsAuth
                hasAuth={Boolean(config.apiKey.trim())}
                onRun={() => exec('webhooks', () => createClient(config).webhooks.listDeliveries())}
                loading={run.loading}
              />
            </>
          )}

          {tab === 'webhooks' && (
            <>
              <ActionCard
                title="webhooks.listDeliveries()"
                hint="Partner audit log (API key)"
                needsAuth
                hasAuth={Boolean(config.apiKey.trim())}
                onRun={() => exec('listDeliveries', () => createClient(config).webhooks.listDeliveries())}
                loading={run.loading}
              />
              <ActionCard
                title="webhooks.verifySignature() local"
                hint="HMAC sha256= demo — no network"
                hasAuth
                onRun={() =>
                  exec('verifySignature', async () => {
                    const secret = 'playground-demo-secret';
                    const rawBody = JSON.stringify({ event: 'escrow.funded', task_id: Number(taskId) || 1 });
                    const key = await crypto.subtle.importKey(
                      'raw',
                      new TextEncoder().encode(secret),
                      { name: 'HMAC', hash: 'SHA-256' },
                      false,
                      ['sign'],
                    );
                    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
                    const hex = Array.from(new Uint8Array(sig))
                      .map((b) => b.toString(16).padStart(2, '0'))
                      .join('');
                    const header = `sha256=${hex}`;
                    const client = createClient(config);
                    const ok = await client.webhooks.verifySignature(secret, rawBody, header);
                    const bad = await client.webhooks.verifySignature(secret, rawBody, 'sha256=00');
                    return { ok, bad, header_prefix: header.slice(0, 18) + '…' };
                  })
                }
                loading={run.loading}
              />
            </>
          )}

          {tab === 'settlement' && (
            <>
              <ActionCard
                title="settlement.completeTask()"
                hint="Requiere tx_hash real on-chain"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('completeTask', () => createClient(config).settlement.completeTask(Number(taskId), {
                  txHash: 'DEMO_TX_HASH_REPLACE_ME',
                }))}
                loading={run.loading}
              />
              <ActionCard
                title="settlement.markDealReleased()"
                hint="Requiere dealId + tx_hash real"
                needsAuth
                hasAuth={hasJwt}
                onRun={() => exec('markDealReleased', () => createClient(config).settlement.markDealReleased(dealId, {
                  txHash: 'DEMO_TX_HASH_REPLACE_ME',
                }))}
                loading={run.loading}
              />
            </>
          )}
        </div>

        <section className="output">
          <div className="output-head">
            <h2>Respuesta</h2>
            {run.label && <code>{run.label}</code>}
            {run.ms != null && <span className="ms">{run.ms} ms</span>}
          </div>
          {run.error && <pre className="error">{run.error}</pre>}
          {run.result != null && (
            <pre className="json">{JSON.stringify(run.result, null, 2)}</pre>
          )}
          {!run.error && run.result == null && !run.loading && (
            <p className="placeholder">Elige una acción para probar el SDK.</p>
          )}
        </section>
      </main>
    </div>
  );
}

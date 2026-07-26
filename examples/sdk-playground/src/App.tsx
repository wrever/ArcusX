import { useCallback, useMemo, useState } from 'react';
import { ArcusXApiError } from '@arcusx/sdk';
import {
  createClient,
  loadConfig,
  saveConfig,
  type PlaygroundConfig,
} from './sdkClient';

type Tab = 'public' | 'marketplace' | 'private' | 'deals' | 'escrow' | 'settlement' | 'disputes' | 'evidence' | 'ratings' | 'trust' | 'rail';

type RunState = {
  loading: boolean;
  label: string;
  result: unknown;
  error: string | null;
  ms: number | null;
};

const TABS: { id: Tab; label: string; auth?: string }[] = [
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
  { id: 'rail', label: 'riel E2E', auth: 'JWT + wallet' },
];

function ActionCard({
  title,
  hint,
  needsAuth,
  hasAuth,
  onRun,
  loading,
}: {
  title: string;
  hint?: string;
  needsAuth?: boolean;
  hasAuth: boolean;
  onRun: () => void;
  loading: boolean;
}) {
  const disabled = loading || (needsAuth && !hasAuth);
  return (
    <div className="action-card">
      <div className="action-card-head">
        <code>{title}</code>
        {needsAuth && <span className="badge">JWT</span>}
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
  const [tab, setTab] = useState<Tab>('public');
  const [taskId, setTaskId] = useState('1');
  const [dealToken, setDealToken] = useState('');
  const [dealId, setDealId] = useState('');
  const [disputeReason, setDisputeReason] = useState('Prueba disputa SDK playground — entrega incompleta.');
  const [nominalQuote, setNominalQuote] = useState('100');
  const [proposalId, setProposalId] = useState('1');
  const [clientWallet, setClientWallet] = useState('');
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
            <p>Integrador externo · @arcusx/sdk v0.3 · riel ArcusX</p>
          </div>
        </header>

        <section className="panel">
          <h2>Conexión</h2>
          <label>
            API URL
            <input
              value={config.baseUrl}
              onChange={(e) => update('baseUrl', e.target.value)}
              placeholder="…/functions/v1/arcusx-api"
            />
          </label>
          <label>
            Supabase anon key
            <input
              type="password"
              value={config.supabaseAnonKey}
              onChange={(e) => update('supabaseAnonKey', e.target.value)}
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
          <span>{ax ? 'Cliente listo' : 'Falta baseUrl'}</span>
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
        </div>

        {tab === 'disputes' && (
          <label className="dispute-reason">
            motivo disputa
            <textarea rows={2} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
          </label>
        )}

        <div className="actions-grid">
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
                onRun={() => exec('createForTask', () => createClient(config).escrow.createForTask(Number(taskId), 1))}
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
                title="webhooks.listDeliveries()"
                needsAuth
                hasAuth={Boolean(config.apiKey.trim())}
                onRun={() => exec('webhooks', () => createClient(config).webhooks.listDeliveries())}
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

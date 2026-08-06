import { useState } from 'react';
import { ArcusXApiError } from '@arcusx/sdk';
import {
  createPartnerClient,
  gatewayHint,
  loadConfig,
  saveConfig,
  type LocalTestConfig,
} from './sdk';

type Tab = 'board' | 'quote' | 'deal';

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
  const [tab, setTab] = useState<Tab>('board');
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nominal, setNominal] = useState('50');
  const [dealToken, setDealToken] = useState('');
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

  function ax() {
    return createPartnerClient(config);
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

  async function runPartnerSmoke() {
    await exec('partner smoke', async () => {
      const client = ax();
      const fee = await client.public.getPlatformFee();
      const stats = await client.public.getMarketStats();
      const list = await client.public.getTasks({ sort_by: 'date_desc' });
      const rows = Array.isArray(list) ? (list as TaskRow[]) : [];
      setTasks(rows);
      if (rows[0]?.id != null) setSelectedId(Number(rows[0].id));
      const samplePrice = Number(rows[0]?.price) || 50;
      setNominal(String(samplePrice));
      const quote = await client.escrow.quote(samplePrice);
      return {
        gateway: gatewayHint(config),
        fee,
        stats,
        tasks_listed: rows.length,
        sample_task: rows[0]
          ? { id: rows[0].id, title: rows[0].title, price: rows[0].price }
          : null,
        quote,
        note: 'Solo API key. Wallet/JWT los maneja la app del integrador.',
      };
    });
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>ArcusX SDK · local-test</h1>
        <p>
          Como lo usa un integrador en su propia app: API key → leer mercado, fee y
          quotes. Sin login ArcusX, sin Freighter, sin wallets aquí.
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
            API URL (opcional — en DEV se usa proxy /partner-api)
            <input
              value={config.baseUrl}
              onChange={(e) => patch({ baseUrl: e.target.value })}
              placeholder="vacío = proxy local → api.arcusx.pro"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="primary"
            disabled={!hasKey || run.loading}
            onClick={() => void runPartnerSmoke()}
          >
            Smoke partner (fee + board + quote)
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              localStorage.removeItem('arcusx-sdk-local-test-v2');
              setConfig(loadConfig());
            }}
          >
            Limpiar
          </button>
          <span className="badge">{hasKey ? 'key ✓' : 'pega tu key'}</span>
        </div>
        <p className="hint" style={{ marginTop: '0.75rem' }}>
          Crear tareas, propuestas o firmar escrow on-chain ocurre en <strong>tu</strong>{' '}
          producto (tus users + tu wallet). Este panel solo ejercita el rail de lectura /
          quote que embebés con el SDK.
        </p>
      </section>

      <section className="panel">
        <h2>Explorar</h2>
        <div className="tabs">
          {(
            [
              ['board', 'Board / tasks'],
              ['quote', 'Fee quote'],
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
        <h2>Resultado</h2>
        <div className="meta">
          <span>
            last: <strong>{run.label || '—'}</strong>
          </span>
          <span>
            ms: <strong>{run.ms ?? '—'}</strong>
          </span>
          <span>{run.loading ? 'running…' : 'idle'}</span>
        </div>
        {run.error ? (
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

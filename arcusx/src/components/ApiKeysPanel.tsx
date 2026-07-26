import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaCheck,
  FaCopy,
  FaPlus,
  FaTrash,
} from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import {
  buildSdkSnippet,
  createUserApiKey,
  getApiKeysContext,
  listUserApiKeys,
  revokeUserApiKey,
  type ApiKeyRecord,
  type ApiKeysContext,
} from '../services/apiKeysService';
import '../css/DeveloperApiKeys.css';

type ApiKeysPanelProps = {
  /** En página dedicada: panel sin borde exterior duplicado */
  variant?: 'embedded' | 'page';
};

const ApiKeysPanel: React.FC<ApiKeysPanelProps> = ({ variant = 'page' }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<ApiKeysContext | null>(null);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [maxKeys, setMaxKeys] = useState(5);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [copied, setCopied] = useState<'key' | 'snippet' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ctx, list] = await Promise.all([getApiKeysContext(), listUserApiKeys()]);
      setContext(ctx);
      setKeys(list.keys);
      setActiveCount(list.active_count);
      setMaxKeys(list.max_active_keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('dashboard.settings.apiKeys.error.load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      setNewKeyPlain(null);
    };
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') setNewKeyPlain(null);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  const activeKeys = useMemo(
    () => keys.filter((k) => !k.revoked_at),
    [keys],
  );

  const canCreate = activeCount < maxKeys && !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createUserApiKey(label);
      setNewKeyPlain(res.api_key);
      setLabel('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('dashboard.settings.apiKeys.error.create'));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!window.confirm(t('dashboard.settings.apiKeys.revoke.confirm'))) return;
    setError(null);
    try {
      await revokeUserApiKey(keyId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('dashboard.settings.apiKeys.error.revoke'));
    }
  };

  const copyText = async (text: string, kind: 'key' | 'snippet') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError(t('dashboard.settings.apiKeys.error.copy'));
    }
  };

  const snippet = context ? buildSdkSnippet() : null;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const rootClass = variant === 'embedded'
    ? 'dev-api-keys dev-api-keys--embedded'
    : 'dev-api-keys';

  return (
    <section
      id="developer-api-keys"
      className={rootClass}
      aria-label={t('dashboard.settings.apiKeys.title')}
    >
      {loading && (
        <p className="dev-api-keys__muted">{t('dashboard.settings.apiKeys.loading')}</p>
      )}

      {error && <p className="dev-api-keys__error" role="alert">{error}</p>}

      {!loading && context && (
        <>
          <div className="dev-api-keys__meta">
            <span className="dev-api-keys__badge">
              {context.sandbox
                ? t('dashboard.settings.apiKeys.sandbox')
                : t('dashboard.settings.apiKeys.live')}
            </span>
            <span className="dev-api-keys__muted">
              {t('dashboard.settings.apiKeys.activeCount')
                .replace('{{count}}', String(activeCount))
                .replace('{{max}}', String(maxKeys))}
            </span>
          </div>

          {newKeyPlain && (
            <div className="dev-api-keys__reveal" role="status">
              <p className="dev-api-keys__reveal-title">
                {t('dashboard.settings.apiKeys.reveal.title')}
              </p>
              <p className="dev-api-keys__reveal-warn">
                {t('dashboard.developer.security.revealOnce')}
              </p>
              <div className="dev-api-keys__secret-row">
                <code className="dev-api-keys__secret">{newKeyPlain}</code>
                <button
                  type="button"
                  className="dev-api-keys__icon-btn"
                  onClick={() => void copyText(newKeyPlain, 'key')}
                  aria-label={t('dashboard.settings.apiKeys.copy')}
                >
                  {copied === 'key' ? <FaCheck /> : <FaCopy />}
                </button>
              </div>
              <p className="dev-api-keys__env-hint">{t('dashboard.developer.security.envHint')}</p>
              <button
                type="button"
                className="dev-api-keys__dismiss"
                onClick={() => setNewKeyPlain(null)}
              >
                {t('dashboard.settings.apiKeys.reveal.dismiss')}
              </button>
            </div>
          )}

          <div className="dev-api-keys__create">
            <input
              type="text"
              className="dev-api-keys__input"
              placeholder={t('dashboard.settings.apiKeys.labelPlaceholder')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={64}
              disabled={!canCreate}
              autoComplete="off"
            />
            <button
              type="button"
              className="dev-api-keys__create-btn"
              onClick={() => void handleCreate()}
              disabled={!canCreate}
            >
              <FaPlus />
              {creating
                ? t('dashboard.settings.apiKeys.creating')
                : t('dashboard.settings.apiKeys.create')}
            </button>
          </div>

          {!canCreate && activeCount >= maxKeys && (
            <p className="dev-api-keys__muted">
              {t('dashboard.settings.apiKeys.maxReached').replace('{{max}}', String(maxKeys))}
            </p>
          )}

          <ul className="dev-api-keys__list">
            {activeKeys.length === 0 && (
              <li className="dev-api-keys__empty">
                {t('dashboard.settings.apiKeys.empty')}
              </li>
            )}
            {activeKeys.map((key) => (
              <li key={key.id} className="dev-api-keys__item">
                <div className="dev-api-keys__item-main">
                  <strong>{key.label}</strong>
                  <code>{key.key_prefix}</code>
                </div>
                <div className="dev-api-keys__item-meta">
                  <span>{t('dashboard.settings.apiKeys.created')}: {formatDate(key.created_at)}</span>
                  <span>{t('dashboard.settings.apiKeys.lastUsed')}: {formatDate(key.last_used_at)}</span>
                </div>
                <button
                  type="button"
                  className="dev-api-keys__revoke"
                  onClick={() => void handleRevoke(key.id)}
                  aria-label={t('dashboard.settings.apiKeys.revoke')}
                >
                  <FaTrash />
                  {t('dashboard.settings.apiKeys.revoke')}
                </button>
              </li>
            ))}
          </ul>

          {context.api_base_url && (
            <p className="dev-api-keys__muted dev-api-keys__base-url">
              {t('dashboard.developer.sdk.baseUrlHint')}
            </p>
          )}

          {snippet && (
            <div className="dev-api-keys__snippet-block">
              <p className="dev-api-keys__snippet-label">{t('dashboard.developer.sdk.exampleTitle')}</p>
              <pre className="dev-api-keys__snippet">{snippet}</pre>
              <button
                type="button"
                className="dev-api-keys__copy-snippet"
                onClick={() => void copyText(snippet, 'snippet')}
              >
                {copied === 'snippet' ? <FaCheck /> : <FaCopy />}
                {t('dashboard.settings.apiKeys.copySnippet')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ApiKeysPanel;

import { buildAuthHeaders, DEFAULT_PARTNER_API_BASE } from './auth.js';
import type { ArcusXClientConfig } from './client.js';
import { ArcusXApiError } from './errors.js';
import type { ApiEnvelope, RequestOptions } from './types.js';

export type HttpClient = {
  get<T>(path: string, query?: Record<string, string | number | undefined>, opts?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>;
  legacyGet<T>(action: string, query?: Record<string, string | number | undefined>, opts?: RequestOptions): Promise<T>;
  legacyPost<T>(action: string, body?: unknown, opts?: RequestOptions): Promise<T>;
};

function stripUndefined(query?: Record<string, string | number | undefined>): Record<string, string> {
  if (!query) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

function apiRoot(config: ArcusXClientConfig): string {
  const base = (config.baseUrl ?? DEFAULT_PARTNER_API_BASE).replace(/\/$/, '');
  // Gateway público partner-api (o api.arcusx.pro cuando DNS esté activo)
  if (base.includes('arcusx-partner-api') || base.includes('api.arcusx.pro')) {
    return base;
  }
  // Supabase Edge legacy: …/arcusx-api
  return base;
}

function v1Root(config: ArcusXClientConfig): string {
  return `${apiRoot(config)}/v1`;
}

function parseBody<T>(json: unknown, status: number, requestId?: string): T {
  if (!json || typeof json !== 'object') {
    throw new ArcusXApiError('Invalid API response', { status, code: 'invalid_response' });
  }

  const envelope = json as ApiEnvelope<T> & Record<string, unknown>;

  if ('meta' in envelope && envelope.success === true && 'data' in envelope) {
    return envelope.data as T;
  }

  if ('meta' in envelope && envelope.success === false && envelope.error) {
    throw new ArcusXApiError(envelope.error.message, {
      status,
      code: envelope.error.code,
      requestId: envelope.meta?.request_id ?? requestId,
      raw: json,
    });
  }

  if (envelope.success === false) {
    throw new ArcusXApiError(String(envelope.message ?? 'API error'), {
      status,
      code: String(envelope.error ?? 'api_error'),
      raw: json,
    });
  }

  return json as T;
}

async function doRequest<T>(
  config: ArcusXClientConfig,
  url: string,
  init: RequestInit,
  opts?: RequestOptions,
): Promise<T> {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const headers = buildAuthHeaders(config, {
    ...(init.headers as Record<string, string> | undefined),
    ...(opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
  });

  const res = await fetchFn(url, { ...init, headers });
  const requestId = res.headers.get('X-Request-Id') ?? undefined;
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    try {
      return parseBody<T>(json, res.status, requestId);
    } catch (e) {
      if (e instanceof ArcusXApiError) throw e;
    }
    const body = json as Record<string, unknown>;
    throw new ArcusXApiError(String(body.message ?? res.statusText), {
      status: res.status,
      code: String(body.error ?? 'http_error'),
      requestId,
      raw: json,
    });
  }

  return parseBody<T>(json, res.status, requestId);
}

export function createHttpClient(config: ArcusXClientConfig): HttpClient {
  const useLegacy = config.useLegacyActions === true;

  const client: HttpClient = {
    get<T>(path: string, query?: Record<string, string | number | undefined>, opts?: RequestOptions) {
      if (useLegacy) {
        throw new Error('legacyGet required when useLegacyActions is true');
      }
      const u = new URL(`${v1Root(config)}${path}`);
      for (const [k, v] of Object.entries(stripUndefined(query))) {
        u.searchParams.set(k, v);
      }
      return doRequest<T>(config, u.toString(), { method: 'GET' }, opts);
    },

    post<T>(path: string, body?: unknown, opts?: RequestOptions) {
      if (useLegacy) {
        throw new Error('legacyPost required when useLegacyActions is true');
      }
      return doRequest<T>(config, `${v1Root(config)}${path}`, {
        method: 'POST',
        body: body != null ? JSON.stringify(body) : undefined,
      }, opts);
    },

    legacyGet<T>(action: string, query?: Record<string, string | number | undefined>, opts?: RequestOptions) {
      const u = new URL(apiRoot(config));
      u.searchParams.set('action', action);
      for (const [k, v] of Object.entries(stripUndefined(query))) {
        u.searchParams.set(k, v);
      }
      return doRequest<T>(config, u.toString(), { method: 'GET' }, opts);
    },

    legacyPost<T>(action: string, body?: unknown, opts?: RequestOptions) {
      const u = new URL(apiRoot(config));
      u.searchParams.set('action', action);
      return doRequest<T>(config, u.toString(), {
        method: 'POST',
        body: body != null ? JSON.stringify(body) : undefined,
      }, opts);
    },
  };

  return client;
}

/** Route GET/POST through REST or legacy based on config. */
export function httpGet<T>(
  client: HttpClient,
  config: ArcusXClientConfig,
  restPath: string,
  legacyAction: string,
  query?: Record<string, string | number | undefined>,
  opts?: RequestOptions,
): Promise<T> {
  if (config.useLegacyActions) {
    return client.legacyGet<T>(legacyAction, query, opts);
  }
  return client.get<T>(restPath, query, opts);
}

export function httpPost<T>(
  client: HttpClient,
  config: ArcusXClientConfig,
  restPath: string,
  legacyAction: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  if (config.useLegacyActions) {
    return client.legacyPost<T>(legacyAction, body, opts);
  }
  return client.post<T>(restPath, body, opts);
}

/** Multipart upload (evidence). No JSON Content-Type. */
export async function httpPostFormData<T>(
  config: ArcusXClientConfig,
  restPath: string,
  legacyAction: string,
  formData: FormData,
  opts?: RequestOptions,
): Promise<T> {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const root = apiRoot(config);
  const url = config.useLegacyActions
    ? `${root}?action=${legacyAction}`
    : `${root}/v1${restPath}`;

  const headers = buildAuthHeaders(config, {
    ...(opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
  }, { omitJsonContentType: true });

  const res = await fetchFn(url, { method: 'POST', headers, body: formData });
  const requestId = res.headers.get('X-Request-Id') ?? undefined;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    try {
      return parseBody<T>(json, res.status, requestId);
    } catch (e) {
      if (e instanceof ArcusXApiError) throw e;
    }
    const body = json as Record<string, unknown>;
    throw new ArcusXApiError(String(body.message ?? res.statusText), {
      status: res.status,
      code: String(body.error ?? 'http_error'),
      requestId,
      raw: json,
    });
  }
  return parseBody<T>(json, res.status, requestId);
}

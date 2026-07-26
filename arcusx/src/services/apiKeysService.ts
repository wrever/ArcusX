import { arcusxApiHeaders, arcusxApiV1Url } from '../config/arcusxApi';

export type ApiKeyRecord = {
  id: string;
  label: string;
  key_prefix: string;
  sandbox: boolean;
  rate_limit_per_min: number;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type ApiKeysContext = {
  partner_id: string;
  sandbox: boolean;
  max_active_keys: number;
  /** URL base del SDK: …/functions/v1/arcusx-api (sin /v1) */
  api_base_url: string;
  api_v1_url?: string;
  sdk_headers: Record<string, string>;
  docs_hint: string;
};

export type ApiKeysListResponse = {
  partner_id: string;
  keys: ApiKeyRecord[];
  active_count: number;
  max_active_keys: number;
};

export type CreateApiKeyResponse = {
  api_key: string;
  key: ApiKeyRecord;
  partner_id: string;
  warning: string;
};

type V1Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  message?: string;
};

function unwrapV1<T>(payload: V1Envelope<T> & T): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data != null) {
    return payload.data as T;
  }
  return payload as T;
}

async function parseV1<T>(res: Response): Promise<T> {
  const payload = (await res.json()) as V1Envelope<T> & T;
  if (!res.ok || payload.success === false) {
    const msg =
      payload.error?.message ??
      payload.message ??
      (typeof payload === 'object' && 'message' in payload ? String(payload.message) : '') ??
      'Error de API';
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return unwrapV1(payload);
}

export async function getApiKeysContext(): Promise<ApiKeysContext> {
  const res = await fetch(arcusxApiV1Url('config/api-keys/context'), {
    headers: arcusxApiHeaders(),
  });
  return parseV1<ApiKeysContext>(res);
}

export async function listUserApiKeys(): Promise<ApiKeysListResponse> {
  const res = await fetch(arcusxApiV1Url('config/api-keys'), {
    headers: arcusxApiHeaders(),
  });
  return parseV1<ApiKeysListResponse>(res);
}

export async function createUserApiKey(label: string, sandbox = true): Promise<CreateApiKeyResponse> {
  const res = await fetch(arcusxApiV1Url('config/api-keys'), {
    method: 'POST',
    headers: arcusxApiHeaders(),
    body: JSON.stringify({ label: label.trim() || 'default', sandbox }),
  });
  return parseV1<CreateApiKeyResponse>(res);
}

export async function revokeUserApiKey(keyId: string): Promise<{ key_id: string; revoked: boolean }> {
  const res = await fetch(arcusxApiV1Url('config/api-keys/revoke'), {
    method: 'POST',
    headers: arcusxApiHeaders(),
    body: JSON.stringify({ key_id: keyId }),
  });
  return parseV1(res);
}

/** URL pública partner API (gateway; no expone Supabase). */
export const PARTNER_PUBLIC_API_BASE = 'https://api.arcusx.pro';

export function buildSdkSnippet(): string {
  return `import { ArcusXClient } from '@arcusx/sdk';

const client = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY,
});

const { job_id } = await client.agent.create({ title: 'Mi job' });`;
}

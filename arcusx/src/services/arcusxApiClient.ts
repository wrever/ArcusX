import { arcusxApiHeaders, arcusxApiUrl } from '../config/arcusxApi';

export async function arcusxApiGet<T = unknown>(
  action: string,
  query?: Record<string, string | number | undefined | null>,
): Promise<T> {
  const res = await fetch(arcusxApiUrl(action, query), {
    method: 'GET',
    headers: arcusxApiHeaders(),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error((data as { message?: string })?.message ?? res.statusText), {
      response: { status: res.status, data },
    });
  }
  return data as T;
}

export async function arcusxApiPost<T = unknown>(
  action: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(arcusxApiUrl(action), {
    method: 'POST',
    headers: arcusxApiHeaders(),
    credentials: 'include',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error((data as { message?: string })?.message ?? res.statusText), {
      response: { status: res.status, data },
    });
  }
  return data as T;
}

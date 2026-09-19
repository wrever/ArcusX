export function newRequestId(): string {
  return crypto.randomUUID();
}

export function wrapSuccessEnvelope(
  body: Record<string, unknown> | unknown[],
  requestId: string,
): Record<string, unknown> {
  if (Array.isArray(body)) {
    return {
      success: true,
      data: body,
      meta: { request_id: requestId, api_version: 'v1' },
    };
  }

  const { success: _s, ...rest } = body;
  return {
    success: true,
    data: Object.keys(rest).length > 0 ? rest : body,
    meta: { request_id: requestId, api_version: 'v1' },
  };
}

export function wrapErrorEnvelope(
  body: Record<string, unknown>,
  requestId: string,
  status: number,
): { envelope: Record<string, unknown>; status: number } {
  const code = String(body.error ?? body.code ?? 'error');
  const message = String(body.message ?? 'Error');
  return {
    envelope: {
      success: false,
      error: { code, message },
      meta: { request_id: requestId, api_version: 'v1' },
    },
    status,
  };
}

export async function envelopeResponse(
  req: Request,
  response: Response,
  requestId: string,
): Promise<Response> {
  const cors = response.headers.get('Content-Type')?.includes('json');
  if (!cors) return response;

  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    return response;
  }

  const wrapped = Array.isArray(body)
    ? wrapSuccessEnvelope(body, requestId)
    : body && typeof body === 'object' && (body as Record<string, unknown>).success === false
      ? wrapErrorEnvelope(body as Record<string, unknown>, requestId, response.status).envelope
      : wrapSuccessEnvelope(body as Record<string, unknown>, requestId);

  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/json; charset=UTF-8');
  headers.set('X-Request-Id', requestId);

  return new Response(JSON.stringify(wrapped), {
    status: response.status,
    headers,
  });
}

export class ArcusXApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly raw?: unknown;

  constructor(message: string, opts: {
    status: number;
    code?: string;
    requestId?: string;
    raw?: unknown;
  }) {
    super(message);
    this.name = 'ArcusXApiError';
    this.status = opts.status;
    this.code = opts.code ?? 'api_error';
    this.requestId = opts.requestId;
    this.raw = opts.raw;
  }
}

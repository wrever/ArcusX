/**
 * ArcusX SDK client — Week 1 skeleton.
 * HTTP modules (tasks, deals, escrow) ship in Week 2 per INSTAAWARDS_SDK_WEEK2.md
 */

export interface ArcusXClientConfig {
  /** e.g. https://<project>.supabase.co/functions/v1/arcusx-api */
  baseUrl: string;
  /** Partner sandbox/production key (x-arcusx-api-key) */
  apiKey?: string;
  /** End-user JWT from sync_supabase_user */
  bearerToken?: string;
  /** Supabase anon key (apikey header) */
  supabaseAnonKey?: string;
  fetch?: typeof fetch;
}

export class ArcusXClient {
  readonly config: ArcusXClientConfig;

  constructor(config: ArcusXClientConfig) {
    if (!config.baseUrl?.trim()) {
      throw new Error('ArcusXClient: baseUrl is required');
    }
    this.config = config;
  }

  // Week 2: client.tasks, client.deals, client.escrow, client.public
}

import type { ArcusXClient } from '../client.js';
import { httpGet } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { RequestOptions } from '../types.js';

export function createWebhooksModule(client: ArcusXClient) {
  return {
    /** Historial de entregas webhook del partner (requiere API key). */
    listDeliveries(opts?: RequestOptions): Promise<{ deliveries: unknown[]; count: number }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.webhookDeliveries,
        LEGACY_ACTIONS.listWebhookDeliveries,
        undefined,
        opts,
      );
    },

    /**
     * Verifica firma HMAC de un payload recibido en tu endpoint.
     * Usa el webhook_secret configurado en el partner dashboard.
     */
    async verifySignature(
      secret: string,
      rawBody: string,
      signatureHeader: string | null | undefined,
    ): Promise<boolean> {
      if (!signatureHeader?.startsWith('sha256=')) return false;
      const expected = signatureHeader.slice(7);
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
      return hex === expected;
    },
  };
}

export type WebhooksModule = ReturnType<typeof createWebhooksModule>;

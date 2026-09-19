import type { ArcusXClient } from '../client.js';
import { httpGet, httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { CreateDisputeInput, DisputeSummary, RequestOptions } from '../types.js';

export function createDisputesModule(client: ArcusXClient) {
  return {
    /** Todas las disputas del usuario (pending + resolved). */
    list(opts?: RequestOptions): Promise<{ disputes: DisputeSummary[]; count: number }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.disputes,
        LEGACY_ACTIONS.listDisputes,
        undefined,
        opts,
      );
    },

    /** Disputas resueltas que requieren firma de liberación. */
    listResolved(opts?: RequestOptions): Promise<{ disputes: DisputeSummary[]; count: number }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.disputesResolved,
        LEGACY_ACTIONS.getUserDisputes,
        undefined,
        opts,
      );
    },

    create(input: CreateDisputeInput, opts?: RequestOptions): Promise<{ dispute_id: number }> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.disputes,
        LEGACY_ACTIONS.createDispute,
        input,
        opts,
      );
    },

    getChatByDispute(disputeId: number, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.disputeChat(disputeId),
        LEGACY_ACTIONS.getDisputeChat,
        { dispute_id: disputeId },
        opts,
      );
    },

    getChatByTask(taskId: number, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.taskDisputeChat(taskId),
        LEGACY_ACTIONS.getDisputeChat,
        { task_id: taskId },
        opts,
      );
    },

    getChatByDeal(dealId: string, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.dealDisputeChat(dealId),
        LEGACY_ACTIONS.getDisputeChat,
        { agreement_id: dealId },
        opts,
      );
    },

    getFilesByDispute(disputeId: number, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.disputeFiles(disputeId),
        LEGACY_ACTIONS.getDisputeFiles,
        { dispute_id: disputeId },
        opts,
      );
    },

    getTimelineByDispute(disputeId: number, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.disputeTimeline(disputeId),
        LEGACY_ACTIONS.getDisputeTimeline,
        { dispute_id: disputeId },
        opts,
      );
    },

    getTimelineByTask(taskId: number, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.taskDisputeTimeline(taskId),
        LEGACY_ACTIONS.getDisputeTimeline,
        { task_id: taskId },
        opts,
      );
    },
  };
}

export type DisputesModule = ReturnType<typeof createDisputesModule>;

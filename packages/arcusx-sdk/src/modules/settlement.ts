import type { ArcusXClient } from '../client.js';
import { httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { CompleteTaskInput, MarkDealReleasedInput, RequestOptions } from '../types.js';

export function createSettlementModule(client: ArcusXClient) {
  return {
    completeTask(
      taskId: number,
      input: { txHash: string; action?: string; rating?: number; ratedUserId?: number },
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      const body: CompleteTaskInput = {
        task_id: taskId,
        action: input.action ?? 'accept',
        tx_hash: input.txHash,
        rating: input.rating,
        rated_user_id: input.ratedUserId,
      };
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.taskEscrowReleaseConfirm(taskId),
        LEGACY_ACTIONS.completeTask,
        body,
        opts,
      );
    },

    markDealReleased(
      dealId: string,
      input: { txHash: string; rating?: number; ratedUserId?: number },
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      const body: MarkDealReleasedInput = {
        agreement_id: dealId,
        transaction_hash: input.txHash,
        rating: input.rating,
        rated_user_id: input.ratedUserId,
      };
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.dealEscrowReleaseConfirm(dealId),
        LEGACY_ACTIONS.markDealReleased,
        body,
        opts,
      );
    },
  };
}

export type SettlementModule = ReturnType<typeof createSettlementModule>;

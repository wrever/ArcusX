import type { ArcusXClient } from '../client.js';
import { httpGet, httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { FinalizePrivateOfferInput, RequestOptions, TaskDetails } from '../types.js';

export function createPrivateModule(client: ArcusXClient) {
  return {
    list(opts?: RequestOptions): Promise<{ offers?: TaskDetails[]; tasks?: TaskDetails[] } | TaskDetails[]> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.privateOffers,
        LEGACY_ACTIONS.getPrivateOffers,
        undefined,
        opts,
      );
    },

    finalize(
      taskId: number,
      body: Omit<FinalizePrivateOfferInput, 'task_id'>,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.taskPrivateFinalize(taskId),
        LEGACY_ACTIONS.finalizePrivateOffer,
        { task_id: taskId, ...body },
        opts,
      );
    },

    accept(taskId: number, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.taskPrivateAccept(taskId),
        LEGACY_ACTIONS.acceptPrivateOffer,
        { task_id: taskId },
        opts,
      );
    },

    reject(taskId: number, reason?: string, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.taskPrivateReject(taskId),
        LEGACY_ACTIONS.rejectPrivateOffer,
        { task_id: taskId, reason },
        opts,
      );
    },
  };
}

export type PrivateModule = ReturnType<typeof createPrivateModule>;

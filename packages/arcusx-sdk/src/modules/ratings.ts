import type { ArcusXClient } from '../client.js';
import { httpGet, httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { CreateRatingInput, RequestOptions } from '../types.js';

export function createRatingsModule(client: ArcusXClient) {
  return {
    create(input: CreateRatingInput, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.ratings,
        LEGACY_ACTIONS.createRating,
        input,
        opts,
      );
    },

    getUserSummary(userId: number, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.userRatingSummary(userId),
        LEGACY_ACTIONS.getUserRatingSummary,
        { user_id: userId },
        opts,
      );
    },
  };
}

export type RatingsModule = ReturnType<typeof createRatingsModule>;

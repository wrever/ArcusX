import type { ArcusXClient } from '../client.js';
import { httpGet } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { MarketStatsResponse, PlatformFeeResponse, RequestOptions, TaskSummary } from '../types.js';

export function createPublicModule(client: ArcusXClient) {
  return {
    getMarketStats(opts?: RequestOptions): Promise<MarketStatsResponse> {
      return httpGet<MarketStatsResponse>(
        client.http,
        client.config,
        REST_PATHS.marketStats,
        LEGACY_ACTIONS.getMarketStats,
        undefined,
        opts,
      );
    },

    getPlatformFee(opts?: RequestOptions): Promise<PlatformFeeResponse> {
      return httpGet<PlatformFeeResponse>(
        client.http,
        client.config,
        REST_PATHS.platformFee,
        LEGACY_ACTIONS.getPlatformFee,
        undefined,
        opts,
      );
    },

    getTasks(
      query?: {
        search?: string;
        min_price?: number;
        max_price?: number;
        category?: string;
        difficulty?: string;
        sort_by?: string;
      },
      opts?: RequestOptions,
    ): Promise<TaskSummary[]> {
      return httpGet<TaskSummary[]>(
        client.http,
        client.config,
        REST_PATHS.tasks,
        LEGACY_ACTIONS.getTasks,
        query,
        opts,
      );
    },
  };
}

export type PublicModule = ReturnType<typeof createPublicModule>;

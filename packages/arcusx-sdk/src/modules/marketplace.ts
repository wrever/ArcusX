import type { ArcusXClient } from '../client.js';
import { httpGet, httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type {
  ApplyTaskInput,
  CreateTaskInput,
  RequestOptions,
  TaskDetails,
  TaskProposal,
} from '../types.js';

export function createMarketplaceModule(client: ArcusXClient) {
  return {
    create(input: CreateTaskInput, opts?: RequestOptions): Promise<{ task_id: number; message?: string }> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.tasks,
        LEGACY_ACTIONS.createTask,
        input,
        opts,
      );
    },

    get(taskId: number, opts?: RequestOptions): Promise<TaskDetails> {
      return httpGet<TaskDetails>(
        client.http,
        client.config,
        REST_PATHS.task(taskId),
        LEGACY_ACTIONS.getTaskDetails,
        { task_id: taskId },
        opts,
      );
    },

    listMine(opts?: RequestOptions): Promise<TaskDetails[]> {
      return httpGet<TaskDetails[]>(
        client.http,
        client.config,
        REST_PATHS.tasksMine,
        LEGACY_ACTIONS.getUserTasks,
        undefined,
        opts,
      );
    },

    apply(
      taskId: number,
      body: ApplyTaskInput,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.taskApplications(taskId),
        LEGACY_ACTIONS.applyTask,
        { taskId, ...body },
        opts,
      );
    },

    getProposals(taskId: number, opts?: RequestOptions): Promise<TaskProposal[]> {
      return httpGet<TaskProposal[]>(
        client.http,
        client.config,
        REST_PATHS.taskProposals(taskId),
        LEGACY_ACTIONS.getTaskProposals,
        { task_id: taskId },
        opts,
      );
    },

    selectProposal(
      taskId: number,
      proposalId: number,
      body?: { escrow_id?: string; transaction_hash?: string },
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.taskSelectProposal(taskId, proposalId),
        LEGACY_ACTIONS.selectProposal,
        { task_id: taskId, proposal_id: proposalId, ...body },
        opts,
      );
    },

    cancel(
      taskId: number,
      body?: { reason?: string; tx_hash?: string },
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.taskCancel(taskId),
        LEGACY_ACTIONS.cancelTask,
        { task_id: taskId, ...body },
        opts,
      );
    },
  };
}

export type MarketplaceModule = ReturnType<typeof createMarketplaceModule>;

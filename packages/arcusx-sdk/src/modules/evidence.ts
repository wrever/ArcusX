import type { ArcusXClient } from '../client.js';
import { httpGet, httpPostFormData } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { RequestOptions } from '../types.js';

export function createEvidenceModule(client: ArcusXClient) {
  return {
    getMilestone(
      taskId: number,
      milestoneIndex = 0,
      opts?: RequestOptions,
    ): Promise<{ evidence: Record<string, unknown> | null }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.taskEvidence(taskId),
        LEGACY_ACTIONS.getMilestoneEvidence,
        { task_id: taskId, milestone_index: milestoneIndex },
        opts,
      );
    },

    getDeal(dealId: string, opts?: RequestOptions): Promise<{ evidence: Record<string, unknown> | null }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.dealEvidence(dealId),
        LEGACY_ACTIONS.getDealEvidence,
        { agreement_id: dealId },
        opts,
      );
    },

    uploadMilestone(
      taskId: number,
      formData: FormData,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      if (!formData.has('task_id')) formData.set('task_id', String(taskId));
      return httpPostFormData(
        client.config,
        REST_PATHS.taskEvidenceUpload(taskId),
        LEGACY_ACTIONS.uploadMilestoneEvidence,
        formData,
        opts,
      );
    },

    uploadDeal(
      dealId: string,
      formData: FormData,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      if (!formData.has('agreement_id')) formData.set('agreement_id', dealId);
      return httpPostFormData(
        client.config,
        REST_PATHS.dealEvidenceUpload(dealId),
        LEGACY_ACTIONS.uploadDealEvidence,
        formData,
        opts,
      );
    },
  };
}

export type EvidenceModule = ReturnType<typeof createEvidenceModule>;

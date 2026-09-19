/**
 * Thin orchestrator (Agentic Week 1) — no LangGraph dependency.
 * Mimics an agent graph: root job + N subjobs + quotes via @arcusx/sdk only.
 *
 *   ARCUSX_API_KEY=axk_test_… node orchestrator-thin.mjs
 */
import { ArcusXClient } from '@arcusx/sdk';

const apiKey = process.env.ARCUSX_API_KEY;
if (!apiKey) {
  console.error('ARCUSX_API_KEY required');
  process.exit(1);
}

const ax = new ArcusXClient({ apiKey, network: 'testnet' });
const payer = process.env.PAYER_WALLET || process.env.AGENTIC_PAYER_WALLET;
const executorWallet = process.env.EXECUTOR_WALLET || process.env.AGENTIC_EXECUTOR_WALLET;
const executorUserId = process.env.EXECUTOR_USER_ID
  ? Number(process.env.EXECUTOR_USER_ID)
  : process.env.AGENTIC_EXECUTOR_USER_ID
    ? Number(process.env.AGENTIC_EXECUTOR_USER_ID)
    : undefined;

const runId = `orch-${Date.now()}`;
const steps = [
  { ref: 'research', amount: 1.0, title: 'Research step' },
  { ref: 'summarize', amount: 1.5, title: 'Summarize step' },
];

const { job_id } = await ax.agent.create({
  title: `Orchestrator run ${runId}`,
  external_ref: runId,
  payer_wallet: payer,
  metadata: { framework: 'orchestrator-thin', steps: steps.length },
});
console.log('job', job_id);

for (const step of steps) {
  const sub = await ax.agent.createSubjob(job_id, {
    title: step.title,
    external_ref: `${runId}-${step.ref}`,
    worker_amount: step.amount,
    executor_type: 'agent',
    executor_wallet: executorWallet,
    executor_user_id: executorUserId,
    completion_condition: 'manual_approve',
  });
  const quote = await ax.agent.quoteEscrow(sub.subjob_id);
  console.log(step.ref, {
    subjob_id: sub.subjob_id,
    task_id: sub.task_id,
    worker_amount: quote.worker_amount,
    platform_fee_rate: quote.platform_fee_rate,
  });
}

const { job } = await ax.agent.get(job_id);
console.log('subjobs', job.subjobs?.length ?? 0);
await ax.agent.cancelJob(job_id);
console.log('cancelled', job_id);

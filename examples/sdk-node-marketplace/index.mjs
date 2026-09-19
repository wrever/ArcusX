/**
 * Marketplace quickstart (SOW 2)
 *
 * Partner path (recommended):
 *   ARCUSX_API_KEY=axk_test_…
 *
 * Create task (optional):
 *   ARCUSX_USER_JWT=…  ARCUSX_USER_ID=…
 *
 * Full path (optional):
 *   RUN_FULL=1 + ARCUSX_WORKER_JWT + ARCUSX_WORKER_WALLET
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ArcusXClient, ArcusXApiError } from '@arcusx/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = {
  ...loadEnvFile(path.join(__dirname, '../../arcusx/.env')),
  ...loadEnvFile(path.join(__dirname, '.env')),
};

const apiKey = (process.env.ARCUSX_API_KEY || fileEnv.ARCUSX_API_KEY)?.trim();
const jwt = (process.env.ARCUSX_USER_JWT || fileEnv.ARCUSX_USER_JWT)?.trim();
const userIdRaw = process.env.ARCUSX_USER_ID || fileEnv.ARCUSX_USER_ID;
const userId = userIdRaw ? Number(userIdRaw) : null;
const baseUrl = (process.env.ARCUSX_API_URL || fileEnv.ARCUSX_API_URL)?.trim();
const runFull = (process.env.RUN_FULL || fileEnv.RUN_FULL || '').trim() === '1';
const workerJwt = (process.env.ARCUSX_WORKER_JWT || fileEnv.ARCUSX_WORKER_JWT)?.trim();
const workerWallet = (process.env.ARCUSX_WORKER_WALLET || fileEnv.ARCUSX_WORKER_WALLET)?.trim();

if (!apiKey && !jwt) {
  console.error('Set ARCUSX_API_KEY=axk_test_… (partner) or ARCUSX_USER_JWT');
  process.exit(1);
}

function fail(e) {
  if (e instanceof ArcusXApiError) {
    console.error('ArcusXApiError', {
      status: e.status,
      code: e.code,
      message: e.message,
      requestId: e.requestId,
    });
  } else {
    console.error(e);
  }
  process.exit(1);
}

try {
  const ax = new ArcusXClient({
    apiKey,
    bearerToken: jwt,
    network: 'testnet',
    ...(baseUrl ? { baseUrl } : {}),
  });

  const fee = await ax.public.getPlatformFee();
  console.log('Platform fee:', fee.platform_fee);

  const stats = await ax.public.getMarketStats();
  console.log('Market stats:', {
    open_tasks: stats.open_tasks,
    total_users: stats.total_users,
    total_volume_usdc: stats.total_volume_usdc,
  });

  const tasks = await ax.public.getTasks({ sort_by: 'date_desc' });
  console.log('Open tasks listed:', Array.isArray(tasks) ? tasks.length : tasks);

  if (jwt && userId && apiKey) {
    const idempotencyKey = `sdk-mkt-${userId}-${Date.now()}`;
    const created = await ax.marketplace.create(
      {
        user_id: userId,
        title: 'SDK quickstart task',
        description: 'Created via @arcusx/sdk example',
        price: 25,
        currency: 'USDC',
        category: 'Desarrollo',
        difficulty: 'Intermedio',
        external_id: `sdk-demo-${Date.now()}`,
      },
      { idempotencyKey },
    );
    console.log('Created task:', created);

    if (runFull && workerJwt && workerWallet) {
      const taskId = Number(created.task_id);
      const worker = new ArcusXClient({
        apiKey,
        bearerToken: workerJwt,
        network: 'testnet',
        ...(baseUrl ? { baseUrl } : {}),
      });
      await worker.marketplace.apply(taskId, {
        message: 'Apply via marketplace example RUN_FULL=1',
        walletAddress: workerWallet,
      });
      const proposals = await ax.marketplace.getProposals(taskId);
      const proposalId = Number((Array.isArray(proposals) ? proposals[0] : null)?.id);
      if (!proposalId) throw new Error('No proposal after apply');
      await ax.marketplace.selectProposal(taskId, proposalId);
      const quote = await ax.escrow.quote(25);
      console.log('RUN_FULL quote:', quote);
    } else if (runFull) {
      console.log('RUN_FULL skipped — set ARCUSX_WORKER_JWT + ARCUSX_WORKER_WALLET');
    }
  } else {
    console.log('Skip create — set ARCUSX_API_KEY + ARCUSX_USER_JWT + ARCUSX_USER_ID');
  }
} catch (e) {
  fail(e);
}

/**
 * SOW 2 Week 2 — Award-style reference flow (SDK-only).
 *
 * create → apply → selectProposal → evidence → quote → createForTask → status
 *
 * Evidence is uploaded AFTER selectProposal (Edge: only accepted worker may upload).
 * On-chain fund/release = Week 3.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ArcusXClient, ArcusXApiError } from '@arcusx/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = {
  ...loadEnvFile(path.join(root, 'arcusx/.env')),
  ...loadEnvFile(path.join(__dirname, '.env')),
  ...process.env,
};

function req(name) {
  const v = (env[name] || '').trim();
  if (!v) {
    console.error(`Missing ${name}. See .env.example`);
    process.exit(1);
  }
  return v;
}

function hr(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 52 - title.length))}`);
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

const apiKey = req('ARCUSX_API_KEY');
const clientJwt = req('ARCUSX_CLIENT_JWT');
const workerJwt = req('ARCUSX_WORKER_JWT');
const clientUserId = Number(req('ARCUSX_CLIENT_USER_ID'));
const workerUserId = Number(env.ARCUSX_WORKER_USER_ID || '0');
const workerWallet = req('ARCUSX_WORKER_WALLET');
const baseUrl = (env.ARCUSX_API_URL || '').trim() || undefined;
const price = 50;
const externalId = `sow2-w2-award-${Date.now()}`;
const idempotencyKey =
  (env.ARCUSX_IDEMPOTENCY_KEY || '').trim() || `sow2-w2-award-${clientUserId}-${Date.now()}`;
const skipEscrowCreate = (env.ARCUSX_SKIP_ESCROW_CREATE || '').trim() === '1';

if (!/^G[A-Z0-9]{55}$/.test(workerWallet)) {
  console.error('ARCUSX_WORKER_WALLET must be a Stellar G… address (56 chars)');
  process.exit(1);
}

function clientAx(bearerToken) {
  return new ArcusXClient({
    apiKey,
    bearerToken,
    network: 'testnet',
    ...(baseUrl ? { baseUrl } : {}),
  });
}

const client = clientAx(clientJwt);
const worker = clientAx(workerJwt);

console.log('@arcusx/sdk — SOW 2 Week 2 award-style reference');
console.log('Network: testnet · SDK-only (no raw fetch)');

try {
  hr('0) Public sanity (partner key)');
  const fee = await client.public.getPlatformFee();
  console.log('platform_fee =', fee.platform_fee);

  hr('1) marketplace.create (campaign / work)');
  const created = await client.marketplace.create(
    {
      user_id: clientUserId,
      title: 'SOW2 Week2 Award — landing microtask',
      description:
        'Award-style validation: create work, accept submission, attach evidence, quote escrow (Testnet).',
      price,
      currency: 'USDC',
      category: 'Desarrollo',
      difficulty: 'Intermedio',
      external_id: externalId,
    },
    { idempotencyKey },
  );
  const taskId = Number(created.task_id);
  console.log('created =', { task_id: taskId, external_id: externalId, idempotencyKey });

  hr('1b) Idempotency — same Idempotency-Key on create');
  let idempotencyDemo = { second_create: null };
  try {
    const again = await client.marketplace.create(
      {
        user_id: clientUserId,
        title: 'SOW2 Week2 Award — landing microtask (dup)',
        description: 'Should hit idempotency path if Edge stores the key.',
        price,
        currency: 'USDC',
        category: 'Desarrollo',
        difficulty: 'Intermedio',
        external_id: `${externalId}-dup`,
      },
      { idempotencyKey },
    );
    idempotencyDemo = {
      second_create_task_id: again.task_id,
      same_as_first: Number(again.task_id) === taskId,
    };
    console.log('idempotency second create =', idempotencyDemo);
  } catch (e) {
    idempotencyDemo = {
      second_create_error:
        e instanceof ArcusXApiError
          ? { status: e.status, code: e.code, message: e.message }
          : String(e),
    };
    console.log('idempotency second create (error path) =', idempotencyDemo);
  }

  hr('2) marketplace.apply (submission)');
  const applyBody = {
    message: 'Award submission via @arcusx/sdk Week 2 reference',
    walletAddress: workerWallet,
    ...(workerUserId > 0 ? { applicantId: workerUserId } : {}),
  };
  const applied = await worker.marketplace.apply(taskId, applyBody, {
    idempotencyKey: `${idempotencyKey}-apply`,
  });
  console.log('apply =', applied);

  hr('3) marketplace.getProposals + selectProposal (winner)');
  const proposals = await client.marketplace.getProposals(taskId);
  const list = Array.isArray(proposals) ? proposals : [];
  console.log('proposals.count =', list.length);
  if (list.length === 0) {
    throw new Error('No proposals returned after apply — check worker JWT / task visibility');
  }
  const proposal = list.find((p) => p.applicant_id === workerUserId) || list[0];
  const proposalId = Number(proposal.id);
  console.log('selected proposal =', {
    id: proposalId,
    applicant_id: proposal.applicant_id,
    status: proposal.status,
  });
  const selected = await client.marketplace.selectProposal(taskId, proposalId, undefined, {
    idempotencyKey: `${idempotencyKey}-select`,
  });
  console.log('selectProposal =', selected);

  hr('4) evidence.uploadMilestone (after assignment)');
  const form = new FormData();
  form.set('task_id', String(taskId));
  form.set('milestone_index', '0');
  form.set(
    'note',
    'SOW2 Week 2 award evidence: deliverable summary attached via SDK FormData.',
  );
  const blob = new Blob(
    ['ArcusX SOW2 Week2 award evidence\nGenerated by examples/sdk-node-award\n'],
    { type: 'text/plain' },
  );
  form.set('file', blob, 'award-evidence.txt');
  const evidence = await worker.evidence.uploadMilestone(taskId, form, {
    idempotencyKey: `${idempotencyKey}-evidence`,
  });
  console.log('evidence.upload =', {
    ok: true,
    keys: evidence && typeof evidence === 'object' ? Object.keys(evidence) : typeof evidence,
  });

  hr('5) escrow.quote');
  const quote = await client.escrow.quote(price);
  console.log('quote =', quote);

  let escrowCreate = null;
  let escrowStatus = null;
  if (!skipEscrowCreate) {
    hr('6) escrow.createForTask + status (escrow-ready)');
    escrowCreate = await client.escrow.createForTask(taskId, proposalId, undefined, {
      idempotencyKey: `${idempotencyKey}-escrow`,
    });
    console.log('createForTask =', escrowCreate);
    escrowStatus = await client.escrow.status(taskId);
    console.log('status =', escrowStatus);
  } else {
    console.log('Skipped escrow.createForTask (ARCUSX_SKIP_ESCROW_CREATE=1)');
  }

  hr('Summary');
  const summary = {
    task_id: taskId,
    proposal_id: proposalId,
    external_id: externalId,
    idempotency_key: idempotencyKey,
    idempotency_demo: idempotencyDemo,
    quote,
    escrow_create: escrowCreate,
    escrow_status: escrowStatus,
    next: 'Week 3: prepareFund → WalletAdapter.sign → confirmFund → release',
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nWeek 2 award-style reference: PASS');
} catch (e) {
  fail(e);
}

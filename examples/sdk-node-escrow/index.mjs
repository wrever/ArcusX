/**
 * SOW 2 Week 3 — Escrow lifecycle (SDK-only).
 *
 * Always: quote + bounded status (if taskId).
 * With JWT + wallet + task: prepareDeploy / prepareFund / prepareRelease (print XDR).
 * Confirm* requires signed tx from integrator WalletAdapter — documented, not bundled.
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
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = {
  ...loadEnvFile(path.join(root, 'arcusx/.env')),
  ...loadEnvFile(path.join(__dirname, '.env')),
  ...process.env,
};

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const apiKey = (env.ARCUSX_API_KEY || '').trim();
if (!apiKey) {
  console.error('Missing ARCUSX_API_KEY');
  process.exit(1);
}

const baseUrl = (env.ARCUSX_API_URL || '').trim() || undefined;
const jwt = (env.ARCUSX_USER_JWT || '').trim();
const wallet = (env.ARCUSX_CLIENT_WALLET || '').trim();
const taskId = Number(env.ARCUSX_TASK_ID || 0);
const proposalId = Number(env.ARCUSX_PROPOSAL_ID || 0);
const nominal = Number(env.ARCUSX_QUOTE_NOMINAL || 50);
const quoteOnly = (env.ARCUSX_QUOTE_ONLY || '').trim() === '1';
const maxPolls = Math.max(1, Math.min(5, Number(env.ARCUSX_STATUS_POLLS || 1) || 1));
const pollMs = Math.max(500, Number(env.ARCUSX_STATUS_POLL_MS || 2000) || 2000);

const partner = new ArcusXClient({ apiKey, network: 'testnet', ...(baseUrl ? { baseUrl } : {}) });
const user =
  jwt
    ? new ArcusXClient({
        apiKey,
        bearerToken: jwt,
        network: 'testnet',
        ...(baseUrl ? { baseUrl } : {}),
      })
    : null;

console.log('@arcusx/sdk — SOW 2 Week 3 escrow lifecycle');
console.log('Network: testnet · bounded status polls =', maxPolls);

try {
  hr('1) escrow.quote');
  const quote = await partner.escrow.quote(nominal);
  console.log(JSON.stringify(quote, null, 2));

  hr('1b) escrow.quote invalid → typed error');
  try {
    await partner.escrow.quote(0);
    console.log('unexpected success');
  } catch (e) {
    if (e instanceof ArcusXApiError) {
      console.log('expected ArcusXApiError', { status: e.status, code: e.code, message: e.message });
    } else {
      throw e;
    }
  }

  if (taskId > 0) {
    hr(`2) escrow.status (bounded ×${maxPolls})`);
    let last = null;
    for (let i = 0; i < maxPolls; i += 1) {
      last = await (user || partner).escrow.status(taskId);
      console.log(`poll ${i + 1}/${maxPolls}`, {
        escrow_status: last?.escrow_status ?? last?.status ?? last,
      });
      if (i + 1 < maxPolls) await sleep(pollMs);
    }
  } else {
    console.log('\nSkip status — set ARCUSX_TASK_ID to poll (bounded).');
  }

  if (quoteOnly) {
    console.log('\nARCUSX_QUOTE_ONLY=1 — stop before prepare*');
    console.log('Week 3 escrow quote path: PASS');
    process.exit(0);
  }

  if (!user || !wallet || !/^G[A-Z0-9]{55}$/.test(wallet) || taskId <= 0 || proposalId <= 0) {
    hr('3) prepare* — SKIPPED');
    console.log('Need ARCUSX_USER_JWT + ARCUSX_CLIENT_WALLET (G…) + ARCUSX_TASK_ID + ARCUSX_PROPOSAL_ID');
    console.log('Week 3 escrow (quote path): PASS · prepare deferred');
    process.exit(0);
  }

  hr('3) escrow.prepareDeploy → unsigned_xdr');
  const deploy = await user.escrow.prepareDeploy(taskId, proposalId, wallet);
  console.log('prepareDeploy keys =', deploy && typeof deploy === 'object' ? Object.keys(deploy) : deploy);
  console.log('unsigned_xdr present =', Boolean(deploy?.unsigned_xdr || deploy?.unsignedTransaction));
  console.log(
    'Next: WalletAdapter.signTransaction(xdr) → escrow.confirmDeploy(taskId, { proposalId, signedXdr | deployTxHash, contractId })',
  );

  hr('4) escrow.prepareFund → unsigned_xdr');
  try {
    const fund = await user.escrow.prepareFund(taskId, wallet);
    console.log('prepareFund keys =', fund && typeof fund === 'object' ? Object.keys(fund) : fund);
    console.log('unsigned_xdr present =', Boolean(fund?.unsigned_xdr || fund?.unsignedTransaction));
    console.log(
      'Next: sign → broadcast → escrow.confirmFund(taskId, { proposalId, contractId, fundTxHash })',
    );
  } catch (e) {
    if (e instanceof ArcusXApiError) {
      console.log('prepareFund (may need deploy first)', {
        status: e.status,
        code: e.code,
        message: e.message,
        requestId: e.requestId,
      });
    } else {
      throw e;
    }
  }

  hr('5) escrow.prepareRelease → steps (after funded + approved work)');
  try {
    const release = await user.escrow.prepareRelease(taskId, wallet);
    console.log('prepareRelease keys =', release && typeof release === 'object' ? Object.keys(release) : release);
    const steps = release?.steps;
    console.log('steps count =', Array.isArray(steps) ? steps.length : 0);
    console.log('Next: sign each step → escrow.confirmRelease(taskId, releaseTxHash)');
  } catch (e) {
    if (e instanceof ArcusXApiError) {
      console.log('prepareRelease (expected if not funded yet)', {
        status: e.status,
        code: e.code,
        message: e.message,
        requestId: e.requestId,
      });
    } else {
      throw e;
    }
  }

  const contractId = (env.ARCUSX_CONTRACT_ID || '').trim();
  const deployTx = (env.ARCUSX_DEPLOY_TX_HASH || '').trim();
  const fundTx = (env.ARCUSX_FUND_TX_HASH || '').trim();
  const releaseTx = (env.ARCUSX_RELEASE_TX_HASH || '').trim();
  const signedDeploy = (env.ARCUSX_SIGNED_DEPLOY_XDR || '').trim();
  const signedFund = (env.ARCUSX_SIGNED_FUND_XDR || '').trim();

  if (signedDeploy || deployTx) {
    hr('6) escrow.confirmDeploy (from env)');
    const confirmed = await user.escrow.confirmDeploy(taskId, {
      proposalId,
      deployTxHash: deployTx || undefined,
      signedXdr: signedDeploy || undefined,
      contractId: contractId || undefined,
      clientWallet: wallet,
    });
    console.log('confirmDeploy =', confirmed);
  }

  if ((signedFund || fundTx) && contractId) {
    hr('7) escrow.confirmFund (from env)');
    const confirmed = await user.escrow.confirmFund(taskId, {
      proposalId,
      contractId,
      fundTxHash: fundTx || undefined,
      signedXdr: signedFund || undefined,
      clientWallet: wallet,
    });
    console.log('confirmFund =', confirmed);
  }

  if (releaseTx) {
    hr('8) escrow.confirmRelease (from env)');
    const confirmed = await user.escrow.confirmRelease(taskId, releaseTx);
    console.log('confirmRelease =', confirmed);
  }

  if (taskId > 0) {
    hr('9) escrow.status (post-action, single read)');
    const st = await user.escrow.status(taskId);
    console.log('status =', st);
  }

  hr('Summary');
  console.log(
    JSON.stringify(
      {
        nominal,
        task_id: taskId,
        proposal_id: proposalId,
        quote,
        next: 'Freighter adapter: examples/sdk-freighter-adapter — confirm* with tx hashes or signed XDR',
        bounded_status_polls: maxPolls,
      },
      null,
      2,
    ),
  );
  console.log('\nWeek 3 escrow lifecycle example: PASS');
} catch (e) {
  fail(e);
}

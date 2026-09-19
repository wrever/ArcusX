/**
 * SOW 2 Week 3 — Webhook HMAC verification (SDK).
 */
import fs from 'fs';
import path from 'path';
import { createHmac } from 'crypto';
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

const secret = (env.WEBHOOK_SECRET || 'sow2-week3-demo-secret').trim();
const apiKey = (env.ARCUSX_API_KEY || '').trim();
const jwt = (env.ARCUSX_USER_JWT || '').trim();
const baseUrl = (env.ARCUSX_API_URL || '').trim() || undefined;

const ax = new ArcusXClient({
  apiKey: apiKey || 'axk_test_local_hmac_only',
  bearerToken: jwt || undefined,
  network: 'testnet',
  ...(baseUrl ? { baseUrl } : {}),
});

console.log('@arcusx/sdk — SOW 2 Week 3 webhooks');

const rawBody = JSON.stringify({
  event: 'escrow.funded',
  task_id: 42,
  fund_tx_hash: 'demo-hash',
});
const hex = createHmac('sha256', secret).update(rawBody).digest('hex');
const goodHeader = `sha256=${hex}`;
const badHeader = 'sha256=deadbeef';

const ok = await ax.webhooks.verifySignature(secret, rawBody, goodHeader);
const bad = await ax.webhooks.verifySignature(secret, rawBody, badHeader);
const missing = await ax.webhooks.verifySignature(secret, rawBody, null);

console.log('verifySignature valid =', ok);
console.log('verifySignature invalid =', bad);
console.log('verifySignature missing =', missing);

if (!ok || bad || missing) {
  console.error('HMAC self-test FAILED');
  process.exit(1);
}

if (apiKey && !apiKey.includes('local_hmac')) {
  try {
    const client = new ArcusXClient({
      apiKey,
      bearerToken: jwt || undefined,
      network: 'testnet',
      ...(baseUrl ? { baseUrl } : {}),
    });
    const deliveries = await client.webhooks.listDeliveries();
    console.log('listDeliveries count =', deliveries?.count ?? deliveries);
  } catch (e) {
    if (e instanceof ArcusXApiError) {
      console.log('listDeliveries (optional)', {
        status: e.status,
        code: e.code,
        message: e.message,
        requestId: e.requestId,
      });
    } else {
      console.error(e);
      process.exit(1);
    }
  }
} else {
  console.log('Skip listDeliveries — set ARCUSX_API_KEY for live audit log');
}

console.log('\nWeek 3 webhooks example: PASS');

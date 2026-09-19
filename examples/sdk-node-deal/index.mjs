/**
 * Deal quickstart — create deal + getByToken (partner gateway).
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
const wallet = (process.env.ARCUSX_WALLET || fileEnv.ARCUSX_WALLET)?.trim();
const baseUrl = (process.env.ARCUSX_API_URL || fileEnv.ARCUSX_API_URL)?.trim();

if (!apiKey || !jwt || !wallet) {
  console.error('ARCUSX_API_KEY, ARCUSX_USER_JWT and ARCUSX_WALLET required');
  process.exit(1);
}

if (!/^G[A-Z0-9]{55}$/.test(wallet)) {
  console.error('ARCUSX_WALLET must be a Stellar G… address');
  process.exit(1);
}

try {
  const ax = new ArcusXClient({
    apiKey,
    bearerToken: jwt,
    network: 'testnet',
    ...(baseUrl ? { baseUrl } : {}),
  });

  const result = await ax.deals.create(
    {
      template_id: 'coaching',
      title: 'SDK deal demo',
      description: 'Quickstart deal via @arcusx/sdk',
      amount_usdc: 50,
      initiator_wallet: wallet,
      beneficiary_wallet: wallet,
      release_signer_wallet: wallet,
      funder_role: 'counterparty',
      external_id: `sdk-deal-${Date.now()}`,
    },
    { idempotencyKey: `sdk-deal-${Date.now()}` },
  );

  console.log('Deal token:', result.deal_token);
  console.log('Share path:', result.deal_url_path);

  const byToken = await ax.deals.getByToken(result.deal_token);
  console.log(
    'getByToken:',
    JSON.stringify(
      {
        deal_id: byToken?.deal?.id ?? byToken?.id,
        title: byToken?.deal?.title ?? byToken?.title,
        amount_usdc: byToken?.deal?.amount_usdc ?? byToken?.amount_usdc,
      },
      null,
      2,
    ),
  );
} catch (e) {
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

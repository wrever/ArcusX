/**
 * Private offers quickstart — list private offers (partner gateway).
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
const baseUrl = (process.env.ARCUSX_API_URL || fileEnv.ARCUSX_API_URL)?.trim();

if (!apiKey || !jwt) {
  console.error('ARCUSX_API_KEY and ARCUSX_USER_JWT required (see .env.example)');
  process.exit(1);
}

try {
  const ax = new ArcusXClient({
    apiKey,
    bearerToken: jwt,
    network: 'testnet',
    ...(baseUrl ? { baseUrl } : {}),
  });

  const offers = await ax.private.list();
  console.log(JSON.stringify(offers, null, 2));
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

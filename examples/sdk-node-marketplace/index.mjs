/**
 * Marketplace quickstart — public stats + optional create (needs JWT).
 * ARCUSX_API_URL, SUPABASE_ANON_KEY, optional ARCUSX_USER_JWT + ARCUSX_API_KEY
 */
import { ArcusXClient } from '@arcusx/sdk';

const baseUrl = process.env.ARCUSX_API_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const jwt = process.env.ARCUSX_USER_JWT;
const apiKey = process.env.ARCUSX_API_KEY;
const userId = process.env.ARCUSX_USER_ID ? Number(process.env.ARCUSX_USER_ID) : null;

if (!baseUrl || !anon) {
  console.error('Set ARCUSX_API_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const ax = new ArcusXClient({ baseUrl, supabaseAnonKey: anon, bearerToken: jwt, apiKey });

const fee = await ax.public.getPlatformFee();
console.log('Platform fee:', fee.platform_fee);

const stats = await ax.public.getMarketStats();
console.log('Market stats:', stats);

if (jwt && userId) {
  const created = await ax.marketplace.create({
    user_id: userId,
    title: 'SDK quickstart task',
    description: 'Created via @arcusx/sdk example',
    price: 25,
    currency: 'USDC',
    category: 'Desarrollo',
    difficulty: 'Intermedio',
    external_id: `sdk-demo-${Date.now()}`,
  }, { idempotencyKey: `sdk-demo-${userId}-${Date.now()}` });
  console.log('Created task:', created);
} else {
  console.log('Skip create — set ARCUSX_USER_JWT + ARCUSX_USER_ID to create a task');
}

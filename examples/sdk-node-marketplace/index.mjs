/**
 * Marketplace quickstart (SOW 2 Week 1+)
 *
 * Partner path (recommended):
 *   ARCUSX_API_KEY=axk_test_…
 *   # optional ARCUSX_API_URL=https://api.arcusx.pro
 *
 * Create task (optional):
 *   ARCUSX_USER_JWT=…  ARCUSX_USER_ID=…
 */
import { ArcusXClient } from '@arcusx/sdk';

const apiKey = process.env.ARCUSX_API_KEY;
const jwt = process.env.ARCUSX_USER_JWT;
const userId = process.env.ARCUSX_USER_ID ? Number(process.env.ARCUSX_USER_ID) : null;
const baseUrl = process.env.ARCUSX_API_URL; // default gateway inside SDK

if (!apiKey && !jwt) {
  console.error('Set ARCUSX_API_KEY=axk_test_… (partner) or ARCUSX_USER_JWT');
  process.exit(1);
}

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
  console.log('Skip create — set ARCUSX_API_KEY + ARCUSX_USER_JWT + ARCUSX_USER_ID');
}

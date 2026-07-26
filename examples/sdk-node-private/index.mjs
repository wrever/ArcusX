/**
 * Private offers quickstart — list private offers for authenticated user.
 */
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  baseUrl: process.env.ARCUSX_API_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  bearerToken: process.env.ARCUSX_USER_JWT,
  apiKey: process.env.ARCUSX_API_KEY,
});

if (!process.env.ARCUSX_USER_JWT) {
  console.error('ARCUSX_USER_JWT required');
  process.exit(1);
}

const offers = await ax.private.list();
console.log(JSON.stringify(offers, null, 2));

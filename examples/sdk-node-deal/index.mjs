/**
 * Deal quickstart — create deal (needs JWT + wallets).
 */
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  baseUrl: process.env.ARCUSX_API_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  bearerToken: process.env.ARCUSX_USER_JWT,
  apiKey: process.env.ARCUSX_API_KEY,
});

const wallet = process.env.ARCUSX_WALLET;
if (!process.env.ARCUSX_USER_JWT || !wallet) {
  console.error('ARCUSX_USER_JWT and ARCUSX_WALLET required');
  process.exit(1);
}

const result = await ax.deals.create({
  template_id: 'coaching',
  title: 'SDK deal demo',
  description: 'Quickstart deal via @arcusx/sdk',
  amount_usdc: 50,
  initiator_wallet: wallet,
  beneficiary_wallet: wallet,
  release_signer_wallet: wallet,
  funder_role: 'counterparty',
  external_id: `sdk-deal-${Date.now()}`,
});

console.log('Deal token:', result.deal_token);
console.log('Share path:', result.deal_url_path);

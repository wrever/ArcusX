#!/usr/bin/env node
/**
 * Genera una API key sandbox/live para arcusx_partners y la inserta (hash SHA-256).
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate-partner-key.mjs \
 *     --slug acme --name "Acme Corp" --sandbox --owner-user-id 3
 *
 * La key en texto plano se imprime UNA vez; guárdala como ARCUSX_API_KEY.
 */
import crypto from 'crypto';
import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    slug: { type: 'string' },
    name: { type: 'string' },
    sandbox: { type: 'boolean', default: true },
    label: { type: 'string', default: 'default' },
    'rate-limit': { type: 'string', default: '60' },
    'owner-user-id': { type: 'string' },
  },
});

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error('Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!values.slug || !values.name) {
  console.error('Requiere --slug y --name');
  process.exit(1);
}

const prefix = values.sandbox ? 'axk_test_' : 'axk_live_';
const secret = crypto.randomBytes(32).toString('base64url');
const rawKey = `${prefix}${secret}`;
const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

async function rest(path, method, body) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

let partnerId;
const existing = await rest(
  `arcusx_partners?slug=eq.${encodeURIComponent(values.slug)}&select=id`,
  'GET',
);
if (Array.isArray(existing) && existing[0]?.id) {
  partnerId = existing[0].id;
  console.log(`Partner existente: ${values.slug} (${partnerId})`);
} else {
  const created = await rest('arcusx_partners', 'POST', {
    name: values.name,
    slug: values.slug,
    sandbox: values.sandbox,
    status: 'active',
    ...(values['owner-user-id']
      ? { owner_user_id: Number(values['owner-user-id']) }
      : {}),
  });
  partnerId = created[0].id;
  console.log(`Partner creado: ${values.slug} (${partnerId})`);
}

if (values['owner-user-id'] && partnerId) {
  await rest(
    `arcusx_partners?id=eq.${partnerId}`,
    'PATCH',
    { owner_user_id: Number(values['owner-user-id']) },
  );
  console.log(`owner_user_id → ${values['owner-user-id']}`);
}

await rest('arcusx_partner_keys', 'POST', {
  partner_id: partnerId,
  key_hash: keyHash,
  label: values.label,
  sandbox: values.sandbox,
  rate_limit_per_min: Number(values['rate-limit']) || 60,
});

console.log('\n--- API KEY (guárdala ahora, no se vuelve a mostrar) ---');
console.log(rawKey);
console.log('---');
console.log(`Export: export ARCUSX_API_KEY='${rawKey}'`);

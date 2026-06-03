#!/usr/bin/env node
/**
 * Genera email-logo-data.ts (legacy, ya no usa la plantilla).
 * Para correos: sube arcusx/public/arcusx-email-logo.png a public_html y opcional ARCUSX_EMAIL_LOGO_URL.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const png = join(root, 'arcusx/public/arcusx-email-logo.png');
const out = join(root, 'supabase/functions/_shared/email-logo-data.ts');
const b64 = readFileSync(png).toString('base64');
writeFileSync(
  out,
  `/** Auto-generated — run: node scripts/bake-email-logo.mjs */\nexport const EMAIL_LOGO_DATA_URL = 'data:image/png;base64,${b64}';\n`,
);
console.log('wrote', out, b64.length, 'chars base64');

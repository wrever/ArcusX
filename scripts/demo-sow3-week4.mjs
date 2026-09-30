#!/usr/bin/env node
/**
 * SOW 3 Week 4 — closeout walkthrough (docs + smoke pointers).
 *
 *   cd packages/arcusx-sdk && npm run demo:sow3:week4
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const sow3 = path.join(root, 'docs/sprints/instaawards-sow3');

const files = [
  'INSTAAWARDS_SOW3_WEEK4.md',
  'WEEK4_NOTION_CHANGELOG.md',
  'FRESH_CLONE_VERIFICATION.md',
  'CLOSEOUT_CHECKLIST.md',
  'MAINNET_READINESS.md',
  'evidence/LIVE_E2E.md',
];

console.log('SOW3 Week4 demo — agentic foundation closeout (SOW 3 CLOSED)\n');
console.log('Gateway: https://api.arcusx.pro · Edge: arcusx-api v133 · Testnet only\n');

let missing = 0;
for (const rel of files) {
  const p = path.join(sow3, rel);
  const ok = fs.existsSync(p);
  console.log(`${ok ? '✓' : '✗'} ${rel}`);
  if (!ok) missing += 1;
}

const live = fs.existsSync(path.join(sow3, 'evidence/LIVE_E2E.md'))
  ? fs.readFileSync(path.join(sow3, 'evidence/LIVE_E2E.md'), 'utf8')
  : '';
const frozen = /Status:\*\* FROZEN|FROZEN/.test(live) && /stellar\.expert\/explorer\/testnet\/tx\/[A-Za-z0-9]{16,}/.test(live);
console.log(`${frozen ? '✓' : '✗'} evidence/LIVE_E2E.md frozen Expert links`);

console.log(`
Verify dry path (reviewer):
  cd packages/arcusx-sdk
  SMOKE_STRICT=1 npm run smoke:sow3:week1
  SMOKE_STRICT=1 npm run smoke:sow3:week2
  npm run smoke:sow3:week3
  npm run smoke:sow3:week4

Ambassador pack (already published):
  - Release v3.8.4
  - ${path.relative(root, path.join(sow3, 'REVIEWER_PACK.md'))}
  - ${path.relative(root, path.join(sow3, 'AGENTIC_QUICKSTART.md'))}
  - ${path.relative(root, path.join(sow3, 'evidence/LIVE_E2E.md'))}
  - Mainnet = checklist only (${path.relative(root, path.join(sow3, 'MAINNET_READINESS.md'))})
`);

if (missing || !frozen) {
  console.error(`Closeout package incomplete (missing=${missing} frozen=${frozen})`);
  process.exit(1);
}
console.log('Week4 demo package OK — SOW 3 CLOSED on Testnet.');

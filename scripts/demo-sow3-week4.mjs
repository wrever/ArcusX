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

console.log('SOW3 Week4 demo — agentic foundation closeout package\n');
console.log('Gateway: https://api.arcusx.pro · Edge: arcusx-api v133 · Testnet only\n');

let missing = 0;
for (const rel of files) {
  const p = path.join(sow3, rel);
  const ok = fs.existsSync(p);
  console.log(`${ok ? '✓' : '✗'} ${rel}`);
  if (!ok) missing += 1;
}

console.log(`
Verify dry path:
  cd packages/arcusx-sdk
  SMOKE_STRICT=1 npm run smoke:sow3:week1
  SMOKE_STRICT=1 npm run smoke:sow3:week2
  npm run smoke:sow3:week3
  npm run smoke:sow3:week4

Freeze live hashes (required for SOW close):
  # Node:  PAYER_SECRET_KEY + AGENTIC_EXECUTOR_USER_ID → npm run demo:sow3:week3
  # UI:    cd local-test && npm run dev  (Freighter fund+release)
  # Then:  edit docs/sprints/instaawards-sow3/evidence/LIVE_E2E.md

Ambassador pack:
  - Release v3.8.3 (when LIVE_E2E filled)
  - ${path.relative(root, path.join(sow3, 'AGENTIC_QUICKSTART.md'))}
  - ${path.relative(root, path.join(sow3, 'evidence/LIVE_E2E.md'))}
  - Mainnet = checklist only (${path.relative(root, path.join(sow3, 'MAINNET_READINESS.md'))})
`);

if (missing) {
  console.error(`Missing ${missing} package file(s)`);
  process.exit(1);
}
console.log('Week4 demo package OK — follow CLOSEOUT_CHECKLIST.md to finish today.');

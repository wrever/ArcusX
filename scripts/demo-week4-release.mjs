#!/usr/bin/env node
/**
 * SOW 2 Week 4 — release-package walkthrough for reviewers.
 *
 * 1) Confirm package version + build artifact
 * 2) Run smoke:strict (Testnet-oriented)
 * 3) Print pointers to Week 4 docs (fresh clone, module status, E2E notes)
 *
 *   cd packages/arcusx-sdk && npm run demo:week4
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pkgDir = path.join(root, 'packages', 'arcusx-sdk');
const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));

function hr(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`);
}

hr(`@arcusx/sdk@${pkg.version} — Week 4 release candidate`);
console.log('Network focus: Stellar Testnet (mainnet = future checklist only)');

const distIndex = path.join(pkgDir, 'dist', 'index.js');
if (!fs.existsSync(distIndex)) {
  console.error('FAIL: dist/ missing — run npm run build first');
  process.exit(1);
}
console.log('OK build artifact:', path.relative(root, distIndex));

hr('smoke:strict');
const smoke = spawnSync('npm', ['run', 'smoke:strict'], {
  cwd: pkgDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});
if (smoke.status !== 0) {
  console.error('FAIL: smoke:strict');
  process.exit(smoke.status ?? 1);
}

hr('Week 4 doc pack');
const docs = [
  'docs/sprints/instaawards-sdk/WEEK4_NOTION_CHANGELOG.md',
  'docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK4.md',
  'docs/sdk/FRESH_CLONE_VERIFICATION.md',
  'docs/sdk/MODULE_STATUS.md',
  'docs/sdk/E2E_DEMO_NOTES.md',
  'docs/sdk/MAINNET_READINESS.md',
  'docs/sdk/KNOWN_LIMITATIONS.md',
];
for (const rel of docs) {
  const abs = path.join(root, rel);
  console.log(fs.existsSync(abs) ? `OK  ${rel}` : `MISS ${rel}`);
}

hr('Next (optional on-chain)');
console.log('cd local-test && npm run dev  →  http://localhost:5200');
console.log('Freighter = client → deploy → fund → liberate (approve → release)');
console.log('\nWeek 4 demo PASS');

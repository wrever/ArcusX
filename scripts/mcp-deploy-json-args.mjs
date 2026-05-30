#!/usr/bin/env node
/** Reads deploy args JSON and prints summary for MCP deploy_edge_function. */
import fs from 'fs';
const path = process.argv[2] || '/tmp/deploy-args-only.json';
const args = JSON.parse(fs.readFileSync(path, 'utf8'));
const router = args.files.find((f) => f.name === 'handlers/router.ts');
console.log(JSON.stringify({
  ok: true,
  name: args.name,
  fileCount: args.files.length,
  routerHasPlatformFee: router?.content.includes('get_platform_fee') ?? false,
  routerHasPlaceholder: router?.content.includes('PLACEHOLDER') ?? false,
  bytes: JSON.stringify(args).length,
}));

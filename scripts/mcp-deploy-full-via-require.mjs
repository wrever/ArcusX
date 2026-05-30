#!/usr/bin/env node
/**
 * Lee bundle JSON y escribe module.exports para CallMcpTool / IPC.
 * Uso: node scripts/mcp-deploy-full-via-require.mjs arcusx-api
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fn = process.argv[2] || 'arcusx-api';
const bundlePath = path.join(__dirname, '../supabase/.deploy', `${fn}.json`);
const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const out = path.join('/tmp', `mcp-deploy-args-${fn}.cjs`);
fs.writeFileSync(out, 'module.exports = ' + JSON.stringify(args) + ';\n');
console.log(out, args.files.length, 'files', JSON.stringify(args).length, 'bytes');

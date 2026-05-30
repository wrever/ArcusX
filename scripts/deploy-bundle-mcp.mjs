#!/usr/bin/env node
/**
 * Imprime el payload de deploy (JSON) en stdout para invocar MCP deploy_edge_function.
 * Uso: node scripts/deploy-bundle-mcp.mjs arcusx-api | head -c 200
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const fn = process.argv[2] || 'arcusx-api';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.join(__dirname, '../supabase/.deploy', `${fn}.json`);
if (!fs.existsSync(bundlePath)) {
  console.error(`Falta ${bundlePath}. Ejecuta: node scripts/bundle-edge-fn.mjs ${fn}`);
  process.exit(1);
}
const payload = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
process.stdout.write(JSON.stringify({
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
  import_map_path: payload.import_map_path,
  files: payload.files,
}));

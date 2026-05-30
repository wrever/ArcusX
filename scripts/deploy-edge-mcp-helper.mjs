#!/usr/bin/env node
/**
 * Imprime argumentos listos para deploy_edge_function MCP desde bundle en supabase/.deploy/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fn = process.argv[2];
if (!fn) {
  console.error('Uso: node scripts/deploy-edge-mcp-helper.mjs <function-name>');
  process.exit(1);
}

const bundlePath = path.join(__dirname, '..', 'supabase', '.deploy', `${fn}.json`);
if (!fs.existsSync(bundlePath)) {
  console.error(`No existe ${bundlePath}. Ejecuta: node scripts/bundle-edge-fn.mjs ${fn}`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const args = {
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
  import_map_path: payload.import_map_path,
  files: payload.files,
};
process.stdout.write(JSON.stringify(args));

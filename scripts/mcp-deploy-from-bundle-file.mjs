#!/usr/bin/env node
/**
 * Lee supabase/.deploy/<fn>.json y llama deploy_edge_function vía MCP HTTP.
 * Requiere: SUPABASE_MCP_ACCESS_TOKEN o token OAuth de mcp.supabase.com
 * Uso: node scripts/mcp-deploy-from-bundle-file.mjs arcusx-api
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fn = process.argv[2] || 'arcusx-api';
const projectRef = process.env.SUPABASE_PROJECT_REF || 'atgsesbstjleabesclzs';
const token =
  process.env.SUPABASE_MCP_ACCESS_TOKEN ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.MCP_ACCESS_TOKEN;

const bundlePath = path.join(__dirname, '../supabase/.deploy', `${fn}.json`);
if (!fs.existsSync(bundlePath)) {
  console.error(`No existe ${bundlePath}. Ejecuta: node scripts/bundle-edge-fn.mjs ${fn}`);
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const url = new URL(`https://mcp.supabase.com/mcp?project_ref=${projectRef}`);

if (!token) {
  console.error('Falta SUPABASE_MCP_ACCESS_TOKEN (OAuth MCP) o SUPABASE_ACCESS_TOKEN (PAT)');
  process.exit(1);
}

const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: 'arcusx-bundle-deploy', version: '1.0.0' }, { capabilities: {} });

try {
  await client.connect(transport);
  const result = await client.callTool({
    name: 'deploy_edge_function',
    arguments: args,
  });
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error('DEPLOY_ERROR', e?.message ?? e);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}

#!/usr/bin/env node
/**
 * Deploy arcusx-api via Supabase MCP (Streamable HTTP).
 * Auth: SUPABASE_MCP_ACCESS_TOKEN or SUPABASE_ACCESS_TOKEN (PAT sbp_...)
 * Bundle: supabase/.deploy/arcusx-api.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = process.argv[2] || path.join(__dirname, '../supabase/.deploy/arcusx-api.json');
const projectRef = process.env.SUPABASE_PROJECT_REF || 'atgsesbstjleabesclzs';
const token =
  process.env.SUPABASE_MCP_ACCESS_TOKEN ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.MCP_ACCESS_TOKEN;

if (!fs.existsSync(bundlePath)) {
  console.error('No existe bundle:', bundlePath);
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const router = args.files.find((f) => f.name === 'handlers/router.ts');
console.error('bundle', args.files.length, 'files', 'get_platform_fee', router?.content.includes('get_platform_fee'), 'placeholder', router?.content.includes('PLACEHOLDER'));

if (!token) {
  console.error('Falta SUPABASE_ACCESS_TOKEN o SUPABASE_MCP_ACCESS_TOKEN');
  process.exit(1);
}

const url = new URL(`https://mcp.supabase.com/mcp?project_ref=${projectRef}`);
const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: 'arcusx-full-deploy', version: '1.0.0' }, { capabilities: {} });

try {
  await client.connect(transport);
  const result = await client.callTool({ name: 'deploy_edge_function', arguments: args });
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error('DEPLOY_ERROR', e?.message ?? e);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}

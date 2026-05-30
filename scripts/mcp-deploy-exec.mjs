#!/usr/bin/env node
/**
 * Invoca deploy_edge_function vía MCP Streamable HTTP (requiere token OAuth en env).
 * Uso: SUPABASE_MCP_ACCESS_TOKEN=... node scripts/mcp-deploy-exec.mjs arcusx-api
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fn = process.argv[2] || 'arcusx-api';
const projectRef = process.env.SUPABASE_PROJECT_REF || 'atgsesbstjleabesclzs';
const token = process.env.SUPABASE_MCP_ACCESS_TOKEN || process.env.MCP_ACCESS_TOKEN;

const bundlePath =
  process.argv[3] ||
  path.join('/tmp', `deploy-args-now.json`) ||
  path.join(__dirname, '..', 'supabase', '.deploy', `${fn}.json`);

if (!token) {
  console.error('Falta SUPABASE_MCP_ACCESS_TOKEN (OAuth de mcp.supabase.com)');
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

const url = new URL(`https://mcp.supabase.com/mcp?project_ref=${projectRef}`);
const transport = new StreamableHTTPClientTransport(url, {
  requestInit: {
    headers: { Authorization: `Bearer ${token}` },
  },
});

const client = new Client({ name: 'arcusx-deploy', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
const result = await client.callTool({
  name: 'deploy_edge_function',
  arguments: args,
});
console.log(JSON.stringify(result, null, 2));
await client.close();

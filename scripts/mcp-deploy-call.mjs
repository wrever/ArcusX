#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath =
  process.argv[2] ||
  path.join(__dirname, '../agent-tools/mcp-deploy-arcusx-api-full.json');
const projectRef = process.env.SUPABASE_PROJECT_REF || 'atgsesbstjleabesclzs';
const token =
  process.env.SUPABASE_MCP_ACCESS_TOKEN ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.MCP_ACCESS_TOKEN;

const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const url = new URL(`https://mcp.supabase.com/mcp?project_ref=${projectRef}`);

const headers = token ? { Authorization: `Bearer ${token}` } : {};
const transport = new StreamableHTTPClientTransport(url, { requestInit: { headers } });
const client = new Client({ name: 'arcusx-deploy', version: '1.0.0' }, { capabilities: {} });

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

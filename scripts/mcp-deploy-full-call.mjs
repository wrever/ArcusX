#!/usr/bin/env node
/**
 * Deploy arcusx-api via Supabase MCP using bundle JSON.
 * Reads /tmp/callmcp-deploy-args.json (or path arg).
 */
import fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const bundlePath = process.argv[2] || '/tmp/callmcp-deploy-args.json';
const projectRef = process.env.SUPABASE_PROJECT_REF || 'atgsesbstjleabesclzs';
const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

const url = new URL(`https://mcp.supabase.com/mcp?project_ref=${projectRef}`);
const token =
  process.env.SUPABASE_MCP_ACCESS_TOKEN ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.MCP_ACCESS_TOKEN ||
  process.env.CURSOR_MCP_SUPABASE_TOKEN;

const headers = token ? { Authorization: `Bearer ${token}` } : {};
const transport = new StreamableHTTPClientTransport(url, { requestInit: { headers } });
const client = new Client({ name: 'arcusx-deploy-full', version: '1.0.0' }, { capabilities: {} });

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

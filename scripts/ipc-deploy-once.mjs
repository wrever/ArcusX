#!/usr/bin/env node
import fs from 'fs';
import net from 'net';

const bundlePath = process.argv[2] || '/tmp/mcp-deploy-args-arcusx-api.json';
const IPC = process.env.VSCODE_IPC_HOOK;
const timeoutMs = Number(process.env.IPC_TIMEOUT_MS || 180000);

if (!IPC) {
  console.error('No VSCODE_IPC_HOOK');
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const request = JSON.stringify({
  type: 'request',
  id: `deploy-${Date.now()}`,
  command: 'mcp.callTool',
  args: {
    server: 'user-supabase',
    toolName: 'deploy_edge_function',
    arguments: args,
  },
});

const client = net.createConnection(IPC);
let out = '';

client.on('connect', () => client.write(request + '\n'));
client.on('data', (d) => { out += String(d); });
client.on('end', () => {
  console.log(out || '(no response)');
  process.exit(out ? 0 : 1);
});
client.on('error', (e) => {
  console.error('IPC error', e.message);
  process.exit(1);
});

setTimeout(() => {
  console.log(out || '(timeout)');
  process.exit(out ? 0 : 1);
}, timeoutMs);

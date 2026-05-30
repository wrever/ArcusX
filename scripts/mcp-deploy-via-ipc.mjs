#!/usr/bin/env node
/**
 * Invoca deploy_edge_function vía socket IPC de Cursor (VSCODE_IPC_HOOK).
 */
import fs from 'fs';
import net from 'net';

const IPC = process.env.VSCODE_IPC_HOOK;
const bundlePath =
  process.argv[2] ||
  '/Users/mac/Documents/GitHub/ArcusX/agent-tools/mcp-deploy-arcusx-api-full.json';

if (!IPC) {
  console.error('No VSCODE_IPC_HOOK');
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

const request = JSON.stringify({
  type: 'request',
  command: 'mcp.callTool',
  args: {
    server: 'user-supabase',
    toolName: 'deploy_edge_function',
    arguments: args,
  },
});

const client = net.createConnection(IPC);
let out = '';
client.on('connect', () => {
  client.write(request + '\n');
});
client.on('data', (d) => {
  out += String(d);
});
client.on('end', () => {
  console.log(out || '(no response)');
  process.exit(0);
});
client.on('error', (e) => {
  console.error('IPC error', e.message);
  process.exit(1);
});
setTimeout(() => {
  console.log(out || '(timeout, partial output above)');
  process.exit(out ? 0 : 1);
}, 300000);

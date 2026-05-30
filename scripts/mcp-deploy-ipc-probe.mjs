#!/usr/bin/env node
import fs from 'fs';
import net from 'net';

const IPC = process.env.VSCODE_IPC_HOOK;
const args = JSON.parse(
  fs.readFileSync(
    process.argv[2] ||
      new URL('../agent-tools/mcp-deploy-arcusx-api-full.json', import.meta.url),
    'utf8',
  ),
);

const payloads = [
  { type: 'request', command: 'mcp.callTool', args: { server: 'user-supabase', toolName: 'deploy_edge_function', arguments: args } },
  { type: 'request', command: 'cursor.mcp.callTool', arguments: { server: 'user-supabase', toolName: 'deploy_edge_function', arguments: args } },
  { method: 'tools/call', params: { name: 'deploy_edge_function', arguments: args } },
];

async function tryPayload(payload, i) {
  return new Promise((resolve) => {
    const client = net.createConnection(IPC);
    let out = '';
    const timer = setTimeout(() => {
      client.destroy();
      resolve({ i, out: out || '(timeout)' });
    }, 15000);
    client.on('connect', () => client.write(JSON.stringify(payload) + '\n'));
    client.on('data', (d) => { out += String(d); });
    client.on('end', () => { clearTimeout(timer); resolve({ i, out }); });
    client.on('error', (e) => { clearTimeout(timer); resolve({ i, error: e.message }); });
  });
}

if (!IPC) {
  console.error('No VSCODE_IPC_HOOK');
  process.exit(1);
}

for (let i = 0; i < payloads.length; i++) {
  const r = await tryPayload(payloads[i], i);
  console.log('--- attempt', i, '---');
  console.log(r.out?.slice(0, 500) || r.error || '(empty)');
}

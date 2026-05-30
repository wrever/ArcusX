#!/usr/bin/env node
/**
 * Invoca deploy_edge_function vía IPC LSP-style (Content-Length framing).
 */
import fs from 'fs';
import net from 'net';

const IPC = process.env.VSCODE_IPC_HOOK;
const bundlePath = process.argv[2] || '/tmp/edge-bundle-arcusx-api.json';

if (!IPC) {
  console.error('No VSCODE_IPC_HOOK');
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const deployArgs = args.arguments ?? args;

const payloads = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'mcp.callTool',
    params: {
      server: 'user-supabase',
      toolName: 'deploy_edge_function',
      arguments: deployArgs,
    },
  },
  {
    type: 'request',
    command: 'mcp.callTool',
    args: {
      server: 'user-supabase',
      toolName: 'deploy_edge_function',
      arguments: deployArgs,
    },
  },
];

function send(payload) {
  return new Promise((resolve) => {
    const client = net.createConnection(IPC);
    let out = '';
    const body = JSON.stringify(payload);
    const framed = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
    const timer = setTimeout(() => {
      client.destroy();
      resolve({ out: out || '(timeout 90s)', timedOut: true });
    }, 90000);
    client.on('connect', () => {
      client.write(framed);
      client.write(body + '\n');
    });
    client.on('data', (d) => {
      out += String(d);
    });
    client.on('end', () => {
      clearTimeout(timer);
      resolve({ out });
    });
    client.on('error', (e) => {
      clearTimeout(timer);
      resolve({ error: e.message });
    });
  });
}

for (let i = 0; i < payloads.length; i++) {
  console.log('--- attempt', i, '---');
  const r = await send(payloads[i]);
  console.log((r.out || r.error || '(empty)').slice(0, 800));
  if (r.out && !r.out.includes('timeout') && r.out.length > 10) break;
}

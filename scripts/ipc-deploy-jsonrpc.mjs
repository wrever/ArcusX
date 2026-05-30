#!/usr/bin/env node
/**
 * Deploy via Cursor IPC using JSON-RPC tools/call framing.
 */
import fs from 'fs';
import net from 'net';

const IPC = process.env.VSCODE_IPC_HOOK;
const bundlePath = process.argv[2] || '/tmp/callmcp-deploy-args.json';
const timeoutMs = Number(process.env.IPC_TIMEOUT_MS || 300000);

if (!IPC) {
  console.error('No VSCODE_IPC_HOOK');
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const payload = {
  jsonrpc: '2.0',
  id: `deploy-${Date.now()}`,
  method: 'tools/call',
  params: {
    name: 'deploy_edge_function',
    arguments: args,
  },
};

const framed = JSON.stringify({
  type: 'request',
  id: payload.id,
  command: 'mcp.callTool',
  args: {
    server: 'user-supabase',
    toolName: 'deploy_edge_function',
    arguments: args,
  },
});

await new Promise((resolve) => {
  const client = net.createConnection(IPC);
  let out = '';
  const timer = setTimeout(() => {
    client.destroy();
    console.log(out || '(timeout)');
    resolve();
  }, timeoutMs);

  client.on('connect', () => {
    client.write(framed + '\n');
    const body = JSON.stringify(payload);
    client.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
  });
  client.on('data', (d) => { out += String(d); });
  client.on('end', () => {
    clearTimeout(timer);
    console.log(out || '(end, no data)');
    resolve();
  });
  client.on('error', (e) => {
    clearTimeout(timer);
    console.error('IPC error', e.message);
    resolve();
  });
});

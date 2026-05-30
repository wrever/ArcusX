#!/usr/bin/env node
/** Prints MCP deploy args JSON to stdout for piping. */
import fs from 'fs';
const path = process.argv[2] || '/tmp/mcp-args-arcusx-api.json';
const args = JSON.parse(fs.readFileSync(path, 'utf8'));
process.stdout.write(JSON.stringify(args));

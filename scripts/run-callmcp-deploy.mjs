#!/usr/bin/env node
/** Prints deploy args JSON to stdout for MCP deploy_edge_function invocation. */
import fs from 'fs';
const path = process.argv[2] || '/Users/mac/Documents/GitHub/ArcusX/supabase/.deploy/callmcp-args-only.json';
const args = JSON.parse(fs.readFileSync(path, 'utf8'));
process.stdout.write(JSON.stringify(args));

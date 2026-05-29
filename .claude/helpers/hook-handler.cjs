#!/usr/bin/env node
/**
 * Claude Flow Hook Handler (Cross-Platform)
 * Dispatches hook events to the appropriate helper modules.
 *
 * Usage: node hook-handler.cjs <command> [args...]
 *
 * Commands:
 *   route          - Route a task to optimal agent (reads PROMPT from env/stdin)
 *   pre-edit       - Allow file edits (Cursor/Claude Code PreToolUse JSON)
 *   pre-bash       - Validate command safety before execution
 *   post-edit      - Record edit outcome for learning
 *   session-restore - Restore previous session state
 *   session-end    - End session and persist state
 */

const path = require('path');
const fs = require('fs');

const helpersDir = __dirname;

// PreToolUse hooks must emit JSON only on stdout (Cursor / Claude Code)
const PRE_TOOL_USE = new Set(['pre-edit', 'pre-bash']);

function emitHookJson(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function emitAllow() {
  emitHookJson({ permission: 'allow' });
}

function emitDeny(message) {
  emitHookJson({
    permission: 'deny',
    user_message: message,
    agent_message: message,
  });
}

function logInfo(...parts) {
  process.stderr.write(parts.join(' ') + '\n');
}

// Safe require with stdout suppression - the helper modules have CLI
// sections that run unconditionally on require(), so we mute console
// during the require to prevent noisy output.
function safeRequire(modulePath) {
  try {
    if (fs.existsSync(modulePath)) {
      const origLog = console.log;
      const origError = console.error;
      console.log = () => {};
      console.error = () => {};
      try {
        const mod = require(modulePath);
        return mod;
      } finally {
        console.log = origLog;
        console.error = origError;
      }
    }
  } catch (e) {
    // silently fail
  }
  return null;
}

const router = safeRequire(path.join(helpersDir, 'router.js'));
const session = safeRequire(path.join(helpersDir, 'session.js'));
const memory = safeRequire(path.join(helpersDir, 'memory.js'));
const intelligence = safeRequire(path.join(helpersDir, 'intelligence.cjs'));

// ── Intelligence timeout protection (fixes #1530, #1531) ───────────────────
const INTELLIGENCE_TIMEOUT_MS = 3000;
function runWithTimeout(fn, label) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      process.stderr.write("[WARN] " + label + " timed out after " + INTELLIGENCE_TIMEOUT_MS + "ms, skipping\n");
      resolve(null);
    }, INTELLIGENCE_TIMEOUT_MS);
    try {
      const result = fn();
      clearTimeout(timer);
      resolve(result);
    } catch (e) {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

const [,, command, ...args] = process.argv;

async function readStdin() {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners();
      process.stdin.pause();
      resolve(data);
    }, 500);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
    process.stdin.resume();
  });
}

async function main() {
  const safetyTimer = setTimeout(() => {
    process.stderr.write("[WARN] Hook handler global timeout (5s), forcing exit\n");
    if (PRE_TOOL_USE.has(command)) emitAllow();
    process.exit(0);
  }, 5000);
  safetyTimer.unref();

  let stdinData = '';
  try { stdinData = await readStdin(); } catch (e) { /* ignore */ }

  let hookInput = {};
  if (stdinData.trim()) {
    try { hookInput = JSON.parse(stdinData); } catch (e) { /* ignore */ }
  }

  const toolInput = hookInput.toolInput || hookInput.tool_input || {};
  const prompt = hookInput.prompt || hookInput.command || toolInput
    || process.env.PROMPT || process.env.TOOL_INPUT_command || args.join(' ') || '';

  const handlers = {
    route: () => {
      if (intelligence && intelligence.getContext) {
        try {
          const ctx = intelligence.getContext(prompt);
          if (ctx) logInfo(ctx);
        } catch (e) { /* non-fatal */ }
      }
      if (router && router.routeTask) {
        const result = router.routeTask(prompt);
        logInfo(`[INFO] Routing task: ${prompt.substring(0, 80) || '(no prompt)'}`);
        logInfo(`Agent: ${result.agent} | Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } else {
        logInfo('[INFO] Router not available, using default routing');
      }
    },

    'pre-edit': () => {
      emitAllow();
    },

    'pre-bash': () => {
      const cmd = String(hookInput.command || toolInput.command || prompt || '').toLowerCase();
      const dangerous = ['rm -rf /', 'format c:', 'del /s /q c:\\', ':(){:|:&};:'];
      for (const d of dangerous) {
        if (cmd.includes(d)) {
          emitDeny(`Dangerous command detected: ${d}`);
          process.exit(2);
        }
      }
      emitAllow();
    },

    'post-edit': () => {
      if (session && session.metric) {
        try { session.metric('edits'); } catch (e) { /* no active session */ }
      }
      if (intelligence && intelligence.recordEdit) {
        try {
          const file = hookInput.file_path || toolInput.file_path
            || process.env.TOOL_INPUT_file_path || args[0] || '';
          intelligence.recordEdit(file);
        } catch (e) { /* non-fatal */ }
      }
      logInfo('[OK] Edit recorded');
    },

    'session-restore': async () => {
      if (session) {
        const existing = session.restore && session.restore();
        if (!existing) {
          session.start && session.start();
        }
      } else {
        logInfo('[OK] Session restored');
      }
      if (intelligence && intelligence.init) {
        const initResult = await runWithTimeout(() => intelligence.init(), 'intelligence.init()');
        if (initResult && initResult.nodes > 0) {
          logInfo(`[INTELLIGENCE] Loaded ${initResult.nodes} patterns, ${initResult.edges} edges`);
        }
      }
    },

    'session-end': async () => {
      if (intelligence && intelligence.consolidate) {
        const consResult = await runWithTimeout(() => intelligence.consolidate(), 'intelligence.consolidate()');
        if (consResult && consResult.entries > 0) {
          logInfo(`[INTELLIGENCE] Consolidated: ${consResult.entries} entries`);
        }
      }
      if (session && session.end) {
        session.end();
      } else {
        logInfo('[OK] Session ended');
      }
    },

    'pre-task': () => {
      if (session && session.metric) {
        try { session.metric('tasks'); } catch (e) { /* no active session */ }
      }
      if (router && router.routeTask && prompt) {
        const result = router.routeTask(prompt);
        logInfo(`[INFO] Task routed to: ${result.agent}`);
      } else {
        logInfo('[OK] Task started');
      }
    },

    'post-task': () => {
      if (intelligence && intelligence.feedback) {
        try { intelligence.feedback(true); } catch (e) { /* non-fatal */ }
      }
      logInfo('[OK] Task completed');
    },

    stats: () => {
      if (intelligence && intelligence.stats) {
        intelligence.stats(args.includes('--json'));
      } else {
        logInfo('[WARN] Intelligence module not available');
      }
    },
  };

  if (command && handlers[command]) {
    try {
      await Promise.resolve(handlers[command]());
    } catch (e) {
      if (PRE_TOOL_USE.has(command)) {
        emitAllow();
      } else {
        logInfo(`[WARN] Hook ${command} error: ${e.message}`);
      }
    }
  } else if (command) {
    if (PRE_TOOL_USE.has(command)) {
      emitAllow();
    } else {
      logInfo(`[OK] Hook: ${command}`);
    }
  } else {
    logInfo('Usage: hook-handler.cjs <route|pre-edit|pre-bash|post-edit|...>');
  }
}

process.exitCode = 0;
main().catch((e) => {
  if (PRE_TOOL_USE.has(command)) {
    try { emitAllow(); } catch (_) {}
  } else {
    try { logInfo(`[WARN] Hook handler error: ${e.message}`); } catch (_) {}
  }
}).finally(() => {
  process.exit(process.exitCode || 0);
});

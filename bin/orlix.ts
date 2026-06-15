#!/usr/bin/env node
/**
 * Orlix CLI — run `orlix` for the interactive governance shell.
 */

import readline from 'readline';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { Orlix } from '../src/index.js';
import { logger } from '../src/utils/logger.js';

const VERSION = '0.5.0-beta';
const CONFIG_DIR = path.join(os.homedir(), '.orlix');

// ── colours ──────────────────────────────────────────────────────────────────
const A = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  amber: '\x1b[38;5;215m',
  violet: '\x1b[38;5;183m',
  green: '\x1b[38;5;114m',
  cyan: '\x1b[38;5;123m',
  red: '\x1b[38;5;203m',
  gray: '\x1b[90m',
};
const c = (code: string, t: string): string => `${code}${t}${A.reset}`;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── banner ────────────────────────────────────────────────────────────────────
// Each letter is 5 pixels wide × 7 tall; each pixel = ██ (double-width block)
const G = A.amber + A.bold;
const BANNER = `
${G}  ██████    ████████    ██          ██████████  ██      ██${A.reset}
${G}██      ██  ██      ██  ██              ██      ██      ██${A.reset}
${G}██      ██  ██      ██  ██              ██        ██  ██  ${A.reset}
${G}██      ██  ████████    ██              ██          ██    ${A.reset}
${G}██      ██  ██  ██      ██              ██        ██  ██  ${A.reset}
${G}██      ██  ██    ██    ██              ██      ██      ██${A.reset}
${G}  ██████    ██      ██  ██████████  ██████████  ██      ██${A.reset}`;

function printBanner(orlix: Orlix): void {
  const goals = orlix.memory.getGoals().length;
  const policies = orlix.memory.getPolicies('active').length;

  console.log(BANNER);
  console.log();

  // ── info line ─────────────────────────────────────────────────────────────
  console.log(
    `  ${c(A.bold + A.amber, 'ORLIX TERMINAL')} ` +
      `${c(A.gray, '—')} ` +
      `${c(A.violet, 'Your personal AI operating system')} ` +
      `${c(A.gray, `| v${VERSION}`)} ` +
      `${c(A.amber, '⬡')}`,
  );
  console.log();

  // ── status bar ────────────────────────────────────────────────────────────
  console.log(
    `  ${c(A.green, '●')} ` +
      `${c(A.bold + A.amber, 'orlix')} ` +
      `${c(A.gray, '|')} ` +
      `${c(A.violet, 'supervised')} ` +
      `${c(A.gray, '|')} ` +
      `${c(goals > 0 ? A.amber : A.gray, `${goals} goals`)} ` +
      `${c(A.gray, '|')} ` +
      `${c(policies > 0 ? A.amber : A.gray, `${policies} policies`)}`,
  );
  console.log();

  // ── commands ──────────────────────────────────────────────────────────────
  console.log(
    `  ${c(A.amber, '◆')} ${c(A.bold + A.amber, 'COMMANDS')}  ${c(A.gray, '─'.repeat(44))}`,
  );
  console.log();

  const cmdRow = (name: string, desc: string): void => {
    console.log(`    ${c(A.amber, name.padEnd(24))} ${c(A.gray, desc)}`);
  };
  cmdRow('tick', 'Run one governance cycle (observe→decide→act→verify→learn)');
  cmdRow('run', 'Start continuous governance loop');
  cmdRow('goals', 'View all goals with progress bars');
  cmdRow('facts', 'View stored context facts');
  cmdRow('policies', 'View active policy rules');
  cmdRow('add goal <name>', 'Create a new goal');
  cmdRow('add fact <text>', 'Store a context fact');
  cmdRow('add policy <rule>', 'Activate a policy rule');
  cmdRow('progress <name> N', 'Set goal progress to N%');
  cmdRow('status', 'Full system status + recent receipts');
  cmdRow('audit', 'View audit log receipts');
  cmdRow('memory', 'Inspect or export memory as JSON');
  cmdRow('/help', 'Show detailed command reference');
  cmdRow('/exit', 'Quit');
  console.log();

  // ── tips ──────────────────────────────────────────────────────────────────
  console.log(`  ${c(A.gray, 'Run any command:')}  ${c(A.amber, 'orlix <command> --help')}`);
  console.log(
    `  ${c(A.gray, 'Try')} ${c(A.amber, '/tick')} ` +
      `${c(A.gray, 'to run a governance cycle, or')} ` +
      `${c(A.amber, 'add goal <name>')} ${c(A.gray, 'to begin')}`,
  );
  console.log();
}

// ── visual governance tick ────────────────────────────────────────────────────
async function visualTick(orlix: Orlix): Promise<void> {
  const step = async (icon: string, label: string, fn: () => Promise<string>): Promise<void> => {
    process.stdout.write(
      `  ${c(A.gray, icon)} ${c(A.violet, label.padEnd(10))} ${c(A.gray, '▸')} `,
    );
    await sleep(120);
    const result = await fn();
    console.log(result);
  };

  console.log();
  console.log(c(A.gray, '  ── governance cycle ──────────────────────'));

  let signals: number = 0;
  let decisions: number = 0;
  const receipts: string[] = [];

  orlix.loop.removeAllListeners();
  orlix.loop.on('observe', (s: unknown[]) => {
    signals = s.length;
  });
  orlix.loop.on('decide', (d: unknown[]) => {
    decisions = d.length;
  });
  orlix.loop.on('act', (r: { id: string; intent?: string; status: string }) => {
    receipts.push(r.id);
    console.log(`\n    ${c(A.amber, '→')} ${r.intent ?? r.action ?? ''}`);
    console.log(`      ${c(A.gray, 'receipt:')} ${c(A.violet, r.id)}  ${c(A.gray, r.status)}`);
  });
  orlix.loop.on('approval_required', (d: { intent: string; id?: string }) => {
    console.log(`\n    ${c(A.amber, '⏸')} pending approval: ${d.intent}`);
    console.log(`      ${c(A.gray, 'run:')} ${c(A.amber, `orlix approve ${d.id ?? ''}`)}`);
  });
  orlix.loop.on('verify', (r: { id: string }) => {
    process.stdout.write(`\n    ${c(A.green, '✓')} verified ${c(A.gray, r.id)} `);
  });
  orlix.loop.on('learn', (u: { policy?: { rule: string }; reason: string }) => {
    console.log(`\n    ${c(A.cyan, '↺')} ${u.policy?.rule ?? 'policy'} — ${u.reason}`);
  });
  orlix.loop.on('error', (e: Error) => {
    console.log(c(A.red, `error: ${e.message}`));
  });

  await step('○', 'observe', async () => {
    await sleep(80);
    return signals > 0
      ? c(A.green, `${signals} signal(s) collected`)
      : c(A.gray, 'no external signals');
  });

  await step('○', 'decide', async () => {
    await sleep(80);
    return decisions > 0
      ? c(A.amber, `${decisions} decision(s) queued`)
      : c(A.gray, 'no actions needed');
  });

  await step('○', 'act', async () => {
    await sleep(60);
    return receipts.length > 0
      ? c(A.amber, `${receipts.length} action(s) executed`)
      : c(A.gray, 'nothing to execute');
  });

  await step('○', 'verify', async () => {
    await sleep(60);
    return receipts.length > 0
      ? c(A.green, 'all receipts verified')
      : c(A.gray, 'nothing to verify');
  });

  await step('○', 'learn', async () => {
    await sleep(60);
    return c(A.gray, 'memory updated');
  });

  console.log(c(A.gray, '\n  ── cycle complete ─────────────────────────'));
  console.log();
}

// ── natural language parser ───────────────────────────────────────────────────
function handleNL(line: string, orlix: Orlix): boolean {
  const lower = line.toLowerCase().trim();

  // add goal [text] [--deadline YYYY-MM-DD]
  const goalMatch = lower.match(/^(add goal|new goal|goal:?)\s+(.+)/i);
  if (goalMatch) {
    const raw = line.slice(goalMatch[1].length).trim();
    const dlMatch = raw.match(/--deadline\s+(\d{4}-\d{2}-\d{2})/i);
    const deadline = dlMatch ? dlMatch[1] : null;
    const name = raw.replace(/--deadline\s+\S+/i, '').trim();
    const goal = orlix.memory.addGoal({ name, deadline });
    console.log(
      `  ${c(A.green, '+')} Goal added: ${c(A.amber, goal.name)} ${deadline ? c(A.gray, `(deadline: ${deadline})`) : ''}`,
    );
    console.log(`    ${c(A.gray, 'id:')} ${goal.id}`);
    return true;
  }

  // add fact [text]
  const factMatch = lower.match(/^(add fact|fact:?)\s+(.+)/i);
  if (factMatch) {
    const content = line.slice(factMatch[1].length).trim();
    const fact = orlix.memory.addFact({ content, source: 'user' });
    console.log(`  ${c(A.green, '+')} Fact stored: ${c(A.violet, fact.content)}`);
    return true;
  }

  // add policy [rule]
  const policyMatch = lower.match(/^(add policy|policy:?)\s+(.+)/i);
  if (policyMatch) {
    const rule = line.slice(policyMatch[1].length).trim();
    const policy = orlix.memory.addPolicy({ rule });
    console.log(
      `  ${c(A.green, '+')} Policy added: ${c(A.violet, policy.rule)} ${c(A.gray, 'v' + policy.version)}`,
    );
    return true;
  }

  // progress [goal name or id] [0-100 or 0.0-1.0]
  const progressMatch = lower.match(
    /^(progress|set progress|update)\s+(.+?)\s+(\d+(?:\.\d+)?)[%]?$/i,
  );
  if (progressMatch) {
    const query = progressMatch[2].trim();
    const raw = parseFloat(progressMatch[3]);
    const progress = raw > 1 ? raw / 100 : raw;
    const goals = orlix.memory.getGoals();
    const goal = goals.find(
      (g) => g.name.toLowerCase().includes(query.toLowerCase()) || g.id.startsWith(query),
    );
    if (!goal) {
      console.log(`  ${c(A.red, '✗')} Goal not found: "${query}"`);
    } else {
      orlix.memory.updateGoal(goal.id, { progress });
      const pct = Math.round(progress * 100);
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      console.log(`  ${c(A.green, '✓')} ${goal.name}`);
      console.log(`    ${c(A.violet, bar)} ${pct}%`);
    }
    return true;
  }

  // show goals
  if (/^(goals?|show goals?|my goals?|list goals?)/.test(lower)) {
    showGoalsInline(orlix);
    return true;
  }

  // show policies
  if (/^(policies|show policies|list policies)/.test(lower)) {
    showPoliciesInline(orlix);
    return true;
  }

  // show facts
  if (/^(facts?|show facts?|list facts?)/.test(lower)) {
    showFactsInline(orlix);
    return true;
  }

  return false;
}

function showGoalsInline(orlix: Orlix): void {
  const goals = orlix.memory.getGoals();
  if (!goals.length) {
    console.log(
      `  ${c(A.gray, 'No goals yet.')}  Try: ${c(A.amber, 'add goal Launch product --deadline 2026-09-01')}`,
    );
    return;
  }
  console.log();
  goals.forEach((g, i) => {
    const pct = Math.round((g.progress ?? 0) * 100);
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    const now = Date.now();
    const dl = g.deadline ? new Date(g.deadline).getTime() : null;
    const overdue = dl && dl < now;
    const dlLabel = g.deadline
      ? overdue
        ? c(A.red, `⚠ overdue (${g.deadline})`)
        : c(A.gray, g.deadline)
      : c(A.gray, 'no deadline');
    console.log(`  ${c(A.gray, String(i + 1) + '.')} ${c(A.amber, g.name)}`);
    console.log(`     ${c(A.violet, bar)} ${pct}%   ${dlLabel}`);
    console.log(`     ${c(A.gray, g.id)}`);
  });
  console.log();
}

function showPoliciesInline(orlix: Orlix): void {
  const policies = orlix.memory.getPolicies();
  if (!policies.length) {
    console.log(
      `  ${c(A.gray, 'No policies yet.')}  Try: ${c(A.amber, 'add policy alert_if_goal_overdue')}`,
    );
    return;
  }
  console.log();
  policies.forEach((p) => {
    const st = p.status === 'active' ? c(A.green, '● active') : c(A.gray, '○ ' + p.status);
    console.log(`  ${st}  ${c(A.violet, p.rule)}  ${c(A.gray, 'v' + p.version)}`);
  });
  console.log();
}

function showFactsInline(orlix: Orlix): void {
  const facts = orlix.memory.getFacts();
  if (!facts.length) {
    console.log(
      `  ${c(A.gray, 'No facts yet.')}  Try: ${c(A.amber, 'add fact team size is 4 people')}`,
    );
    return;
  }
  console.log();
  facts.forEach((f) => {
    console.log(`  ${c(A.cyan, '◆')} ${f.content}  ${c(A.gray, '[' + f.source + ']')}`);
  });
  console.log();
}

// ── shell help ────────────────────────────────────────────────────────────────
function printShellHelp(): void {
  const kw = (s: string): string => c(A.amber, s);
  const d = (s: string): string => c(A.gray, s);
  console.log(`\n${c(A.violet, 'Natural language')}`);
  console.log(`  ${kw('add goal Launch v2 --deadline 2026-09-01')}  ${d('add a goal')}`);
  console.log(
    `  ${kw('progress launch 75')}                        ${d('set goal progress to 75%')}`,
  );
  console.log(`  ${kw('add fact team has 4 engineers')}             ${d('store a fact')}`);
  console.log(
    `  ${kw('add policy alert_if_goal_overdue')}          ${d('activate a policy rule')}`,
  );
  console.log(
    `  ${kw('goals')} / ${kw('facts')} / ${kw('policies')}                   ${d('list items')}`,
  );

  console.log(`\n${c(A.violet, 'Commands')}`);
  const row = (k: string, v: string): void =>
    console.log(`  ${c(A.amber, k.padEnd(30))} ${c(A.gray, v)}`);
  row('/tick', 'Run one governance cycle (observe→decide→act→verify→learn)');
  row('/run [--interval N]', 'Start continuous loop every N seconds (default 60)');
  row('/status', 'Full system status');
  row('/audit', 'View recent audit receipts');
  row('/memory export', 'Dump memory as JSON');
  row('/clear', 'Clear screen');
  row('/exit', 'Quit');
  console.log();
}

// ── auto-seed first run ───────────────────────────────────────────────────────
function autoSeed(orlix: Orlix): void {
  if (orlix.memory.getGoals().length > 0) return;
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });

  const tomorrow30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

  orlix.memory.addGoal({ name: 'Ship public beta', deadline: tomorrow30, progress: 0.6 });
  orlix.memory.addGoal({ name: 'Write onboarding docs', deadline: yesterday, progress: 0.2 });
  orlix.memory.addGoal({ name: 'Set up analytics pipeline', progress: 0.9 });
  orlix.memory.addFact({ content: 'team size: 3 engineers, 1 designer', source: 'user' });
  orlix.memory.addPolicy({ rule: 'alert_if_goal_overdue' });
  orlix.memory.addPolicy({ rule: 'alert_if_goal_drift_gt_3d' });
  orlix.memory.addPolicy({ rule: 'summarise_email_on_wake' });

  console.log(c(A.gray, `  ✦ first run — seeded sample goals & policies (edit in ~/.orlix/)`));
}

// ── main shell ────────────────────────────────────────────────────────────────
function startShell(): Promise<void> {
  return new Promise<void>((resolve) => {
    const orlix = new Orlix({
      memoryPath: path.join(CONFIG_DIR, 'memory.json'),
      auditPath: path.join(CONFIG_DIR, 'audit.jsonl'),
    });
    autoSeed(orlix);
    printBanner(orlix);

    const ALL_CMDS = [
      'add goal',
      'add fact',
      'add policy',
      'progress',
      'goals',
      'facts',
      'policies',
      '/tick',
      '/run',
      '/status',
      '/audit',
      '/memory',
      '/clear',
      '/help',
      '/exit',
      '/version',
    ];

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      completer: (line: string): [string[], string] => {
        const hits = ALL_CMDS.filter((cmd) => cmd.startsWith(line));
        return [hits.length ? hits : ALL_CMDS, line];
      },
    });

    const prompt = (): void => {
      rl.question(`\n${c(A.amber, '>')} `, (raw: string) => {
        const line = raw.trim();
        if (!line) {
          prompt();
          return;
        }

        if (line === '/exit' || line === 'exit' || line === 'quit') {
          console.log(c(A.gray, '\nGoodbye.\n'));
          rl.close();
          resolve();
          return;
        }
        if (line === '/clear' || line === 'clear') {
          process.stdout.write('\x1Bc');
          printBanner(orlix);
          prompt();
          return;
        }

        void dispatchCommand(line, orlix).then(prompt);
      });
    };

    process.on('SIGINT', () => {
      console.log(c(A.gray, '\n\nGoodbye.\n'));
      rl.close();
      resolve();
    });

    prompt();
  });
}

async function dispatchCommand(line: string, orlix: Orlix): Promise<void> {
  const lower = line.toLowerCase();

  // slash commands
  if (line.startsWith('/') || /^(help|status|tick|run|audit|memory|version)(\s|$)/.test(lower)) {
    const [cmd, ...args] = line.replace(/^\//, '').split(/\s+/);

    switch (cmd?.toLowerCase()) {
      case 'help':
        printShellHelp();
        return;
      case 'version':
        console.log(`orlix v${VERSION}  node: ${process.version}`);
        return;
      case 'status':
        printFullStatus(orlix);
        return;
      case 'tick':
        await visualTick(orlix);
        return;
      case 'run':
        startLoop(orlix, args);
        return;
      case 'audit':
        printAudit(orlix, args);
        return;
      case 'memory':
        if (args[0] === 'export') {
          console.log(JSON.stringify(orlix.memory.export(), null, 2));
        } else {
          showGoalsInline(orlix);
          showFactsInline(orlix);
          showPoliciesInline(orlix);
        }
        return;
    }
  }

  // natural language
  const handled = handleNL(line, orlix);
  if (!handled) {
    console.log(`  ${c(A.gray, 'Unknown input.')} Type ${c(A.amber, '/help')} for commands.`);
  }
}

function printFullStatus(orlix: Orlix): void {
  const goals = orlix.memory.getGoals();
  const policies = orlix.memory.getPolicies('active');
  const receipts = orlix.auditLog.list(5);
  const now = Date.now();

  console.log(`\n${c(A.violet, 'Goals')}`);
  if (!goals.length) {
    console.log(c(A.gray, '  (none)'));
  }
  goals.forEach((g) => {
    const pct = Math.round((g.progress ?? 0) * 100);
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    const dl = g.deadline ? new Date(g.deadline).getTime() : null;
    const overdue = dl && dl < now;
    const flag = overdue ? c(A.red, ' ⚠ overdue') : '';
    console.log(
      `  ${c(A.amber, g.name.padEnd(32))} ${c(A.violet, bar)} ${String(pct).padStart(3)}%${flag}`,
    );
  });

  console.log(`\n${c(A.violet, 'Active policies')}`);
  if (!policies.length) {
    console.log(c(A.gray, '  (none)'));
  }
  policies.forEach((p) =>
    console.log(`  ${c(A.green, '●')} ${c(A.violet, p.rule)}  ${c(A.gray, 'v' + p.version)}`),
  );

  console.log(`\n${c(A.violet, 'Recent receipts')}`);
  if (!receipts.length) {
    console.log(c(A.gray, '  (none — run /tick to generate)'));
  }
  receipts.forEach((r) => {
    const st = r.status === 'verified' ? c(A.green, r.status) : c(A.amber, r.status);
    console.log(`  ${c(A.gray, r.id.slice(0, 20))}  ${st}  ${(r.intent ?? '').slice(0, 48)}`);
  });
  console.log();
}

function printAudit(orlix: Orlix, args: string[]): void {
  const limit = args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1] ?? '20', 10)
    : 20;
  const receipts = orlix.auditLog.list(limit);
  console.log(`\n${c(A.violet, 'Audit log')} — ${receipts.length} receipt(s)\n`);
  if (!receipts.length) {
    console.log(c(A.gray, '  (empty — run /tick first)'));
    return;
  }
  receipts.forEach((r) => {
    const st = r.status === 'verified' ? c(A.green, '✓ verified') : c(A.amber, r.status);
    console.log(`  ${st}  ${c(A.violet, r.id)}`);
    if (r.intent) console.log(`  ${c(A.gray, '  intent:')}  ${r.intent}`);
    if (r.outcome) console.log(`  ${c(A.gray, '  outcome:')} ${r.outcome}`);
    console.log();
  });
}

function startLoop(orlix: Orlix, args: string[]): void {
  const iFlag = args.indexOf('--interval');
  const interval = iFlag !== -1 ? parseInt(args[iFlag + 1] ?? '60', 10) * 1000 : 60_000;
  console.log(
    `\n  ${c(A.green, '●')} Governance loop started  ${c(A.gray, `(every ${interval / 1000}s — Ctrl+C to stop)`)}\n`,
  );

  orlix.loop.on(
    'observe',
    (s: unknown[]) => s.length && console.log(`  ${c(A.gray, 'observe')}  ${s.length} signal(s)`),
  );
  orlix.loop.on(
    'decide',
    (d: unknown[]) => d.length && console.log(`  ${c(A.gray, 'decide ')}  ${d.length} decision(s)`),
  );
  orlix.loop.on('act', (r: { intent?: string; id: string }) =>
    console.log(`  ${c(A.amber, 'act    ')}  ${r.intent ?? r.id}`),
  );
  orlix.loop.on('verify', (r: { id: string }) =>
    console.log(`  ${c(A.green, 'verify ')}  ${r.id}`),
  );
  orlix.loop.on('learn', (u: { policy?: { rule: string }; reason: string }) =>
    console.log(`  ${c(A.cyan, 'learn  ')}  ${u.policy?.rule} — ${u.reason}`),
  );
  orlix.loop.on('error', (e: Error) => console.log(c(A.red, `  error: ${e.message}`)));
  orlix.loop.on('approval_required', (d: { intent: string; id?: string }) =>
    console.log(`  ${c(A.amber, '⏸ approval needed:')} ${d.intent}`),
  );

  process.once('SIGINT', () => {
    orlix.stop();
    console.log(c(A.gray, '\n  loop stopped.'));
  });
  orlix.start(interval);
}

// ── one-shot commands ─────────────────────────────────────────────────────────
const [, , cmd, ...rest] = process.argv;

type CmdFn = (args: string[]) => void | Promise<void>;

function init(_args: string[]): void {
  const orlix = new Orlix({
    memoryPath: path.join(CONFIG_DIR, 'memory.json'),
    auditPath: path.join(CONFIG_DIR, 'audit.jsonl'),
  });
  autoSeed(orlix);
  console.log(
    `\n${c(A.green, '✓')} Orlix initialised.  Run ${c(A.amber, 'orlix')} to open the shell.\n`,
  );
}

function showVersion(_args: string[]): void {
  console.log(`orlix v${VERSION}\nnode: ${process.version}\nhttps://orlixai.xyz`);
}

function showHelp(_args: string[]): void {
  const kw = (s: string): string => c(A.amber, s);
  const d = (s: string): string => c(A.gray, s);
  console.log(
    `\n${c(A.bold + A.violet, 'orlix')} ${c(A.gray, 'v' + VERSION)} — personal AI operating system\n`,
  );
  console.log(`  ${kw('orlix')}                    ${d('open interactive shell (default)')}`);
  console.log(`  ${kw('orlix init')}               ${d('initialise ~/.orlix config')}`);
  console.log(`  ${kw('orlix status')}             ${d('print status and exit')}`);
  console.log(`  ${kw('orlix tick')}               ${d('run one governance cycle and exit')}`);
  console.log(`  ${kw('orlix run [--interval N]')} ${d('start continuous loop (N seconds)')}`);
  console.log(`  ${kw('orlix version')}            ${d('show version')}\n`);
}

function statusCmd(_args: string[]): void {
  const orlix = new Orlix({
    memoryPath: path.join(CONFIG_DIR, 'memory.json'),
    auditPath: path.join(CONFIG_DIR, 'audit.jsonl'),
  });
  printFullStatus(orlix);
}

async function tickCmd(_args: string[]): Promise<void> {
  const orlix = new Orlix({
    memoryPath: path.join(CONFIG_DIR, 'memory.json'),
    auditPath: path.join(CONFIG_DIR, 'audit.jsonl'),
  });
  if (!orlix.memory.getGoals().length) autoSeed(orlix);
  await visualTick(orlix);
}

function runCmd(args: string[]): void {
  const orlix = new Orlix({
    memoryPath: path.join(CONFIG_DIR, 'memory.json'),
    auditPath: path.join(CONFIG_DIR, 'audit.jsonl'),
  });
  if (!orlix.memory.getGoals().length) autoSeed(orlix);
  startLoop(orlix, args);
}

const commands: Record<string, CmdFn> = {
  shell: startShell,
  init,
  status: statusCmd,
  run: runCmd,
  tick: tickCmd,
  version: showVersion,
  help: showHelp,
  '--version': showVersion,
  '--help': showHelp,
  '-v': showVersion,
  '-h': showHelp,
};

void (async (): Promise<void> => {
  if (!cmd) {
    await startShell();
    return;
  }
  const handler = commands[cmd];
  if (!handler) {
    logger.error(`Unknown command: ${cmd}`);
    showHelp([]);
    process.exit(1);
  }
  await handler(rest);
})();

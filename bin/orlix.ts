#!/usr/bin/env node
/**
 * Orlix CLI — run `orlix` for interactive shell, or `orlix <command>`
 */

import readline from 'readline';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { Orlix } from '../src/index.js';
import { logger } from '../src/utils/logger.js';

const VERSION = '0.5.0-beta';
const TOOLS = 12;
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
  gray: '\x1b[90m',
};
const c = (code: string, t: string): string => `${code}${t}${A.reset}`;

// ── ASCII banner ──────────────────────────────────────────────────────────────
const BANNER = `
${A.cyan}${A.bold} ██████╗ ██████╗ ██╗     ██╗██╗  ██╗${A.reset}
${A.cyan}${A.bold}██╔═══██╗██╔══██╗██║     ██║╚██╗██╔╝${A.reset}
${A.cyan}${A.bold}██║   ██║██████╔╝██║     ██║ ╚███╔╝ ${A.reset}
${A.cyan}${A.bold}██║   ██║██╔══██╗██║     ██║ ██╔██╗ ${A.reset}
${A.cyan}${A.bold}╚██████╔╝██║  ██║███████╗██║██╔╝ ██╗${A.reset}
${A.cyan}${A.bold} ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═╝${A.reset}
`;

function printBanner(): void {
  console.log(BANNER);
  console.log(
    `  ${c(A.gray, `v${VERSION}`)} ${c(A.gray, '·')} ${c(A.amber, String(TOOLS) + ' tools')} ${c(A.gray, '·')} ${c(A.violet, 'governance AI OS')} ${c(A.gray, '·')} ${c(A.gray, 'orlixai.xyz')}`,
  );
  console.log(c(A.gray, '  ─────────────────────────────────────────'));
  console.log(`  ${c(A.dim + A.gray, 'Type anything. /help for commands. Ctrl+C to exit.')}`);
}

function printModeInfo(orlix: Orlix): void {
  const tier = orlix.loop ? 'supervised' : 'supervised';
  const goals = orlix.memory.getGoals().length;
  const facts = orlix.memory.getFacts().length;
  const active = orlix.memory.getPolicies('active').length;
  console.log(
    `  Mode: ${c(A.green, tier)} (full tool use)\n` +
      `  Memory: ${c(A.amber, String(goals))} goals · ${c(A.amber, String(facts))} facts · ${c(A.amber, String(active))} active policies\n`,
  );
}

// ── interactive REPL ─────────────────────────────────────────────────────────
function startShell(): Promise<void> {
  return new Promise<void>((resolve) => {
    printBanner();
    console.log('');

    const orlix = new Orlix();
    printModeInfo(orlix);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      completer: (line: string): [string[], string] => {
        const cmds = [
          '/help',
          '/status',
          '/tick',
          '/run',
          '/memory',
          '/audit',
          '/policy',
          '/goals',
          '/facts',
          '/clear',
          '/version',
          '/exit',
        ];
        const hits = cmds.filter((cmd) => cmd.startsWith(line));
        return [hits.length ? hits : cmds, line];
      },
    });

    const prompt = (): void => {
      rl.question(`\n${c(A.amber, '>')} `, (input: string) => {
        const line = input.trim();

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
          printBanner();
          console.log('');
          printModeInfo(orlix);
          prompt();
          return;
        }

        void handleShellInput(line, orlix).then(prompt);
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

async function handleShellInput(line: string, orlix: Orlix): Promise<void> {
  const [cmd, ...rest] = line.split(/\s+/);

  switch (cmd) {
    case '/help':
    case 'help':
      printShellHelp();
      break;

    case '/status':
    case 'status':
      status([]);
      break;

    case '/tick':
    case 'tick':
      await runTick([]);
      break;

    case '/run':
    case 'run':
      run(rest);
      break;

    case '/memory':
    case 'memory':
      await memoryCmd(rest);
      break;

    case '/audit':
    case 'audit':
      auditCmd(rest);
      break;

    case '/policy':
    case 'policy':
      policyCmd(rest);
      break;

    case '/goals':
    case 'goals': {
      const goals = orlix.memory.getGoals();
      if (!goals.length) {
        console.log(c(A.gray, '  (no goals)'));
        break;
      }
      goals.forEach((g) => {
        const pct = Math.round((g.progress ?? 0) * 100);
        const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
        console.log(
          `  ${c(A.gray, g.id.slice(0, 8))}  ${g.name.padEnd(28)} ${c(A.violet, bar)} ${pct}%`,
        );
      });
      break;
    }

    case '/facts':
    case 'facts': {
      const facts = orlix.memory.getFacts();
      if (!facts.length) {
        console.log(c(A.gray, '  (no facts)'));
        break;
      }
      facts.forEach((f) =>
        console.log(`  ${c(A.gray, f.id.slice(0, 8))}  ${f.content}  ${c(A.gray, f.source)}`),
      );
      break;
    }

    case '/version':
    case 'version':
      showVersion([]);
      break;

    default:
      console.log(c(A.gray, `  Unknown command: ${line}. Type /help for commands.`));
  }
}

function printShellHelp(): void {
  const row = (k: string, v: string): void =>
    console.log(`  ${c(A.amber, k.padEnd(26))} ${c(A.gray, v)}`);
  console.log(`\n${c(A.violet, 'Commands')}`);
  row('/help', 'Show this help');
  row('/status', 'Goals, policies, recent receipts');
  row('/tick', 'Run one governance cycle');
  row('/run [--interval N]', 'Start continuous loop (N seconds)');
  row('/goals', 'List goals with progress bars');
  row('/facts', 'List stored facts');
  row('/memory list', 'Full memory dump');
  row('/memory add-goal', 'Add a goal interactively');
  row('/memory add-policy', 'Add a policy rule');
  row('/audit list', 'Recent audit receipts');
  row('/policy list', 'Active policies');
  row('/version', 'Show version');
  row('/clear', 'Clear screen');
  row('/exit', 'Quit');
  console.log('');
}

// ── one-shot commands ─────────────────────────────────────────────────────────
const [, , cmd, ...rest] = process.argv;

type CmdFn = (args: string[]) => void | Promise<void>;

const commands: Record<string, CmdFn> = {
  shell: startShell,
  init,
  status,
  run,
  tick: runTick,
  memory: memoryCmd,
  audit: auditCmd,
  policy: policyCmd,
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

// ── command implementations ───────────────────────────────────────────────────

function init(_args: string[]): void {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const orlix = new Orlix();
  logger.section('orlix init');
  logger.ok(`Config: ${c(A.violet, CONFIG_DIR)}`);

  if (!orlix.memory.getGoals().length) {
    const g = orlix.memory.addGoal({
      name: 'Ship MVP',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
    logger.ok(`Sample goal: "${g.name}"`);
  }
  if (!orlix.memory.getPolicies().length) {
    ['alert_if_goal_drift_gt_3d', 'alert_if_goal_overdue', 'require_confirm_before_send'].forEach(
      (rule) => {
        const p = orlix.memory.addPolicy({ rule });
        logger.ok(`Policy: ${p.rule}`);
      },
    );
  }
  logger.section('done');
  logger.info(`Run ${c(A.amber, 'orlix')} to start the interactive shell.`);
}

function status(_args: string[]): void {
  const orlix = new Orlix();
  logger.section('orlix status');
  const goals = orlix.memory.getGoals();
  const policies = orlix.memory.getPolicies('active');
  const receipts = orlix.auditLog.list(5);

  logger.ok(`tier: ${c(A.amber, 'supervised')} (default)`);
  console.log('');
  logger.info(`Goals (${c(A.amber, String(goals.length))})`);
  goals.forEach((g) => {
    const pct = Math.round((g.progress ?? 0) * 100);
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    console.log(
      `  ${c(A.gray, g.id.slice(0, 8))}  ${g.name.padEnd(32)}${c(A.violet, bar)} ${pct}%`,
    );
  });
  console.log('');
  logger.info(`Policies (${c(A.amber, String(policies.length))} active)`);
  policies.forEach((p) =>
    console.log(`  ${c(A.violet, p.rule.padEnd(40))} ${c(A.gray, 'v' + p.version)}`),
  );
  console.log('');
  logger.info(`Recent receipts (${c(A.amber, String(receipts.length))})`);
  receipts.forEach((r) => {
    const st = r.status === 'verified' ? c(A.green, r.status) : c(A.amber, r.status);
    console.log(`  ${c(A.gray, r.id.slice(0, 24))}  ${st}  ${(r.intent ?? '').slice(0, 50)}`);
  });
}

function run(args: string[]): void {
  const iFlag = args.indexOf('--interval');
  const interval = iFlag !== -1 ? parseInt(args[iFlag + 1] ?? '60', 10) * 1000 : 60_000;
  const orlix = new Orlix();
  logger.section('governance loop');
  logger.info(`Interval: ${c(A.amber, interval / 1000 + 's')} · Tier: ${c(A.amber, 'supervised')}`);
  logger.info(`Press ${c(A.amber, 'Ctrl+C')} to stop.\n`);

  orlix.loop.on(
    'observe',
    (s: unknown[]) => s.length && logger.ok(`Observed ${s.length} signal(s)`),
  );
  orlix.loop.on('decide', (d: unknown[]) => d.length && logger.ok(`${d.length} decision(s)`));
  orlix.loop.on('act', (r: Parameters<typeof logger.receipt>[0]) => logger.receipt(r));
  orlix.loop.on('verify', (r: { id: string }) => logger.ok(`Verified: ${r.id}`));
  orlix.loop.on('learn', (u: { policy?: { rule: string }; reason: string }) =>
    logger.ok(`Policy update: ${u.policy?.rule} — ${u.reason}`),
  );
  orlix.loop.on('error', (e: Error) => logger.error(e.message));
  orlix.loop.on('approval_required', (d: { intent: string; id?: string }) => {
    logger.warn(`Approval required: ${d.intent}`);
    logger.info(`  Run: ${c(A.amber, `orlix approve ${d.id ?? ''}`)}`);
  });

  process.on('SIGINT', () => {
    logger.dim('\nStopping…');
    orlix.stop();
    process.exit(0);
  });
  orlix.start(interval);
}

async function runTick(_args: string[]): Promise<void> {
  const orlix = new Orlix();
  logger.section('single tick');
  const r = await orlix.tick();
  logger.ok(
    `Signals: ${r.signals.length}  Decisions: ${r.decisions.length}  Receipts: ${r.receipts.length}  Updates: ${r.updates.length}`,
  );
  r.receipts.forEach((rec) => logger.receipt(rec));
}

async function memoryCmd(args: string[]): Promise<void> {
  const sub = args[0];
  const orlix = new Orlix();

  if (!sub || sub === 'list') {
    logger.section('memory');
    const goals = orlix.memory.getGoals();
    const facts = orlix.memory.getFacts();
    const policies = orlix.memory.getPolicies();
    console.log(`\n${c(A.amber, 'Goals')} (${goals.length})`);
    goals.forEach((g) =>
      console.log(
        `  [${g.id.slice(0, 8)}] ${g.name}  ${c(A.gray, g.deadline ?? 'no deadline')}  ${Math.round((g.progress ?? 0) * 100)}%`,
      ),
    );
    console.log(`\n${c(A.amber, 'Facts')} (${facts.length})`);
    facts.forEach((f) =>
      console.log(`  [${f.id.slice(0, 8)}] ${f.content}  ${c(A.gray, f.source)}`),
    );
    console.log(`\n${c(A.amber, 'Policies')} (${policies.length})`);
    policies.forEach((p) =>
      console.log(
        `  [${p.id.slice(0, 8)}] ${p.rule}  ${c(A.violet, 'v' + p.version)}  ${p.status}`,
      ),
    );
  } else if (sub === 'add-goal') {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const q = (p: string): Promise<string> => new Promise((res) => rl.question(p, res));
    const name = await q(c(A.violet, '> name: '));
    const deadline = await q(c(A.violet, '> deadline (YYYY-MM-DD, blank to skip): '));
    rl.close();
    const goal = orlix.memory.addGoal({ name: name.trim(), deadline: deadline.trim() || null });
    logger.ok(`Goal added: "${goal.name}" (${goal.id})`);
  } else if (sub === 'add-policy') {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const rule = await new Promise<string>((res) => rl.question(c(A.violet, '> rule: '), res));
    rl.close();
    const p = orlix.memory.addPolicy({ rule: rule.trim() });
    logger.ok(`Policy added: ${p.rule} (v${p.version})`);
  } else if (sub === 'export') {
    console.log(JSON.stringify(orlix.memory.export(), null, 2));
  } else {
    logger.error(`Unknown subcommand: ${sub}. Valid: list, add-goal, add-policy, export`);
  }
}

function auditCmd(args: string[]): void {
  const sub = args[0];
  const orlix = new Orlix();

  if (!sub || sub === 'list') {
    const limit = args.includes('--limit')
      ? parseInt(args[args.indexOf('--limit') + 1] ?? '20', 10)
      : 20;
    const receipts = orlix.auditLog.list(limit);
    logger.section(`audit log — ${receipts.length} receipts`);
    if (!receipts.length) {
      logger.dim('(empty)');
      return;
    }
    receipts.forEach((r) => logger.receipt(r));
  } else if (sub === 'get') {
    const id = args[1];
    if (!id) {
      logger.error('Usage: orlix audit get <id>');
      return;
    }
    const r = orlix.auditLog.get(id);
    if (!r) {
      logger.error(`Not found: ${id}`);
      return;
    }
    logger.receipt(r);
  } else {
    logger.error(`Unknown subcommand: ${sub}. Valid: list [--limit N], get <id>`);
  }
}

function policyCmd(args: string[]): void {
  const orlix = new Orlix();
  if (!args[0] || args[0] === 'list') {
    const policies = orlix.memory.getPolicies();
    logger.section('policies');
    if (!policies.length) {
      logger.dim('(none)');
      return;
    }
    policies.forEach((p) => {
      const st = p.status === 'active' ? c(A.green, 'active') : c(A.amber, p.status);
      console.log(`  ${st}  ${c(A.violet, p.rule.padEnd(42))} ${c(A.gray, 'v' + p.version)}`);
    });
  }
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
  console.log(
    `${c(A.amber, 'USAGE')}\n  orlix                      ${d('start interactive shell')}`,
  );
  console.log(`  orlix <command> [options]\n`);
  console.log(`${c(A.amber, 'COMMANDS')}`);
  [
    ['shell', 'Start interactive shell (default)'],
    ['init', 'Initialise Orlix with default goals + policies'],
    ['status', 'Show goals, policies, and recent receipts'],
    ['run [--interval N]', 'Start the governance loop (N = seconds, default 60)'],
    ['tick', 'Run one loop cycle and exit'],
    ['memory list', 'List all goals, facts, and policies'],
    ['memory add-goal', 'Add a goal interactively'],
    ['memory add-policy', 'Add a policy rule interactively'],
    ['memory export', 'Export memory as JSON to stdout'],
    ['audit list [--limit N]', 'Show recent audit receipts'],
    ['audit get <id>', 'Show a specific receipt'],
    ['policy list', 'List all policies'],
    ['version', 'Show version info'],
    ['help', 'Show this help'],
  ].forEach(([k, v]) => console.log(`  ${kw(k.padEnd(30))} ${d(v)}`));
  console.log(
    `\n${c(A.gray, 'Docs: https://orlixai.xyz  ·  GitHub: github.com/tylerbroqs/orlixai')}\n`,
  );
}

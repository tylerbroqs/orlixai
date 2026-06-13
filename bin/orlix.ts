#!/usr/bin/env node
/**
 * Orlix CLI
 * Usage: orlix <command> [options]
 */

import readline from 'readline';
import path     from 'path';
import os       from 'os';
import fs       from 'fs';
import { Orlix }  from '../src/index.js';
import { logger } from '../src/utils/logger.js';

const VERSION   = '0.5.0-beta';
const CONFIG_DIR = path.join(os.homedir(), '.orlix');

const A = {
  reset:  '\x1b[0m', bold: '\x1b[1m', amber: '\x1b[38;5;215m',
  violet: '\x1b[38;5;183m', green: '\x1b[38;5;114m', gray: '\x1b[90m',
};
const c = (code: string, t: string): string => `${code}${t}${A.reset}`;

const [,, cmd = 'help', ...rest] = process.argv;

const commands: Record<string, (args: string[]) => Promise<void>> = {
  init, status, run, tick: runTick,
  memory: memoryCmd, audit: auditCmd, policy: policyCmd,
  version: showVersion, help: showHelp,
  '--version': showVersion, '--help': showHelp, '-v': showVersion, '-h': showHelp,
};

(async () => {
  const handler = commands[cmd];
  if (!handler) { logger.error(`Unknown command: ${cmd}`); await showHelp([]); process.exit(1); }
  await handler(rest);
})();

// ── commands ──────────────────────────────────────────────────────────────────

async function init(_args: string[]): Promise<void> {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const orlix = new Orlix();
  logger.section('orlix init');
  logger.ok(`Config: ${c(A.violet, CONFIG_DIR)}`);

  if (!orlix.memory.getGoals().length) {
    const g = orlix.memory.addGoal({ name: 'Ship MVP', deadline: new Date(Date.now() + 30*86400000).toISOString().slice(0,10) });
    logger.ok(`Sample goal: "${g.name}"`);
  }
  if (!orlix.memory.getPolicies().length) {
    ['alert_if_goal_drift_gt_3d','alert_if_goal_overdue','require_confirm_before_send']
      .forEach(rule => { const p = orlix.memory.addPolicy({ rule }); logger.ok(`Policy: ${p.rule}`); });
  }
  logger.section('done');
  logger.info(`Run ${c(A.amber,'orlix run')} to start.`);
}

async function status(_args: string[]): Promise<void> {
  const orlix = new Orlix();
  logger.section('orlix status');
  const goals    = orlix.memory.getGoals();
  const policies = orlix.memory.getPolicies('active');
  const receipts = orlix.auditLog.list(5);

  logger.ok(`tier: ${c(A.amber,'supervised')} (default)`);
  console.log('');
  logger.info(`Goals (${c(A.amber, String(goals.length))})`);
  goals.forEach(g => {
    const pct = Math.round((g.progress ?? 0)*100);
    const bar = '█'.repeat(Math.round(pct/10))+'░'.repeat(10-Math.round(pct/10));
    console.log(`  ${c(A.gray,g.id.slice(0,8))}  ${g.name.padEnd(32)}${c(A.violet,bar)} ${pct}%`);
  });
  console.log('');
  logger.info(`Policies (${c(A.amber, String(policies.length))} active)`);
  policies.forEach(p => console.log(`  ${c(A.violet,p.rule.padEnd(40))} ${c(A.gray,'v'+p.version)}`));
  console.log('');
  logger.info(`Recent receipts (${c(A.amber, String(receipts.length))})`);
  receipts.forEach(r => {
    const st = r.status==='verified' ? c(A.green,r.status) : c(A.amber,r.status);
    console.log(`  ${c(A.gray,r.id.slice(0,24))}  ${st}  ${(r.intent??'').slice(0,50)}`);
  });
}

async function run(args: string[]): Promise<void> {
  const iFlag   = args.indexOf('--interval');
  const interval = iFlag !== -1 ? parseInt(args[iFlag+1]??'60',10)*1000 : 60_000;
  const orlix   = new Orlix();
  logger.section('governance loop');
  logger.info(`Interval: ${c(A.amber, interval/1000+'s')} · Tier: ${c(A.amber,'supervised')}`);
  logger.info(`Press ${c(A.amber,'Ctrl+C')} to stop.\n`);

  orlix.loop.on('observe',  (s: unknown[]) => s.length && logger.ok(`Observed ${s.length} signal(s)`));
  orlix.loop.on('decide',   (d: unknown[]) => d.length && logger.ok(`${d.length} decision(s)`));
  orlix.loop.on('act',      (r: Parameters<typeof logger.receipt>[0]) => logger.receipt(r));
  orlix.loop.on('verify',   (r: { id: string }) => logger.ok(`Verified: ${r.id}`));
  orlix.loop.on('learn',    (u: { policy?: { rule: string }; reason: string }) => logger.ok(`Policy update: ${u.policy?.rule} — ${u.reason}`));
  orlix.loop.on('error',    (e: Error) => logger.error(e.message));
  orlix.loop.on('approval_required', (d: { intent: string; id?: string }) => {
    logger.warn(`Approval required: ${d.intent}`);
    logger.info(`  Run: ${c(A.amber, `orlix approve ${d.id ?? ''}`)}`);
  });

  process.on('SIGINT', () => { logger.dim('\nStopping…'); orlix.stop(); process.exit(0); });
  orlix.start(interval);
}

async function runTick(_args: string[]): Promise<void> {
  const orlix = new Orlix();
  logger.section('single tick');
  const r = await orlix.tick();
  logger.ok(`Signals: ${r.signals.length}  Decisions: ${r.decisions.length}  Receipts: ${r.receipts.length}  Updates: ${r.updates.length}`);
  r.receipts.forEach(rec => logger.receipt(rec));
}

async function memoryCmd(args: string[]): Promise<void> {
  const sub   = args[0];
  const orlix = new Orlix();

  if (!sub || sub === 'list') {
    logger.section('memory');
    const goals    = orlix.memory.getGoals();
    const facts    = orlix.memory.getFacts();
    const policies = orlix.memory.getPolicies();
    console.log(`\n${c(A.amber,'Goals')} (${goals.length})`);
    goals.forEach(g => console.log(`  [${g.id.slice(0,8)}] ${g.name}  ${c(A.gray,g.deadline??'no deadline')}  ${Math.round((g.progress??0)*100)}%`));
    console.log(`\n${c(A.amber,'Facts')} (${facts.length})`);
    facts.forEach(f => console.log(`  [${f.id.slice(0,8)}] ${f.content}  ${c(A.gray,f.source)}`));
    console.log(`\n${c(A.amber,'Policies')} (${policies.length})`);
    policies.forEach(p => console.log(`  [${p.id.slice(0,8)}] ${p.rule}  ${c(A.violet,'v'+p.version)}  ${p.status}`));

  } else if (sub === 'add-goal') {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const q  = (p: string): Promise<string> => new Promise(res => rl.question(p, res));
    const name     = await q(c(A.violet,'> name: '));
    const deadline = await q(c(A.violet,'> deadline (YYYY-MM-DD, blank to skip): '));
    rl.close();
    const goal = orlix.memory.addGoal({ name: name.trim(), deadline: deadline.trim() || null });
    logger.ok(`Goal added: "${goal.name}" (${goal.id})`);

  } else if (sub === 'add-policy') {
    const rl   = readline.createInterface({ input: process.stdin, output: process.stdout });
    const rule = await new Promise<string>(res => rl.question(c(A.violet,'> rule: '), res));
    rl.close();
    const p = orlix.memory.addPolicy({ rule: rule.trim() });
    logger.ok(`Policy added: ${p.rule} (v${p.version})`);

  } else if (sub === 'export') {
    console.log(JSON.stringify(orlix.memory.export(), null, 2));
  } else {
    logger.error(`Unknown subcommand: ${sub}. Valid: list, add-goal, add-policy, export`);
  }
}

async function auditCmd(args: string[]): Promise<void> {
  const sub   = args[0];
  const orlix = new Orlix();

  if (!sub || sub === 'list') {
    const limit    = args.includes('--limit') ? parseInt(args[args.indexOf('--limit')+1]??'20',10) : 20;
    const receipts = orlix.auditLog.list(limit);
    logger.section(`audit log — ${receipts.length} receipts`);
    if (!receipts.length) { logger.dim('(empty)'); return; }
    receipts.forEach(r => logger.receipt(r));
  } else if (sub === 'get') {
    const id = args[1];
    if (!id) { logger.error('Usage: orlix audit get <id>'); return; }
    const r = orlix.auditLog.get(id);
    if (!r) { logger.error(`Not found: ${id}`); return; }
    logger.receipt(r);
  } else {
    logger.error(`Unknown subcommand: ${sub}. Valid: list [--limit N], get <id>`);
  }
}

async function policyCmd(args: string[]): Promise<void> {
  const orlix = new Orlix();
  if (!args[0] || args[0] === 'list') {
    const policies = orlix.memory.getPolicies();
    logger.section('policies');
    if (!policies.length) { logger.dim('(none)'); return; }
    policies.forEach(p => {
      const st = p.status==='active' ? c(A.green,'active') : c(A.amber,p.status);
      console.log(`  ${st}  ${c(A.violet,p.rule.padEnd(42))} ${c(A.gray,'v'+p.version)}`);
    });
  }
}

async function showVersion(_args: string[]): Promise<void> {
  console.log(`orlix v${VERSION}\nnode: ${process.version}\nhttps://orlixai.xyz`);
}

async function showHelp(_args: string[]): Promise<void> {
  const kw = (s: string): string => c(A.amber, s);
  const d  = (s: string): string => c(A.gray, s);
  console.log(`\n${c(A.bold+A.violet,'orlix')} ${c(A.gray,'v'+VERSION)} — personal AI operating system\n`);
  console.log(`${c(A.amber,'USAGE')}\n  orlix <command> [options]\n`);
  console.log(`${c(A.amber,'COMMANDS')}`);
  [
    ['init',                      'Initialise Orlix with default goals + policies'],
    ['status',                    'Show goals, policies, and recent receipts'],
    ['run [--interval N]',        'Start the governance loop (N = seconds, default 60)'],
    ['tick',                      'Run one loop cycle and exit'],
    ['memory list',               'List all goals, facts, and policies'],
    ['memory add-goal',           'Add a goal interactively'],
    ['memory add-policy',         'Add a policy rule interactively'],
    ['memory export',             'Export memory as JSON to stdout'],
    ['audit list [--limit N]',    'Show recent audit receipts'],
    ['audit get <id>',            'Show a specific receipt'],
    ['policy list',               'List all policies'],
    ['version',                   'Show version info'],
    ['help',                      'Show this help'],
  ].forEach(([k,v]) => console.log(`  ${kw(k!.padEnd(30))} ${d(v!)}`));
  console.log(`\n${c(A.gray,'Docs: https://orlixai.xyz  ·  GitHub: github.com/tylerbroqs/orlixai')}\n`);
}

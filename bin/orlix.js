#!/usr/bin/env node
/**
 * Orlix CLI — command-line interface for the Orlix governance engine.
 *
 * Usage:
 *   orlix <command> [options]
 *
 * Commands:
 *   init                  Initialise Orlix in the current directory
 *   status                Show system status
 *   run [--interval N]    Start the governance loop (interval in seconds, default 60)
 *   tick                  Run one governance loop cycle and exit
 *   memory list           List stored goals, facts, policies
 *   memory add-goal       Add a goal interactively
 *   memory add-policy     Add a policy rule interactively
 *   memory export         Print memory as JSON
 *   audit list [--limit N] Show recent audit receipts
 *   audit get <id>        Show a specific receipt
 *   policy list           List active policies
 *   version               Show version info
 *   help                  Show this help
 */

import readline from 'readline';
import path     from 'path';
import os       from 'os';
import fs       from 'fs';
import { Orlix }     from '../src/index.js';
import { logger }    from '../src/utils/logger.js';

const ANSI = {
  reset:  '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  amber:  '\x1b[38;5;215m', violet: '\x1b[38;5;183m',
  green:  '\x1b[38;5;114m', red: '\x1b[38;5;203m', gray: '\x1b[90m',
};
const c = (code, t) => `${code}${t}${ANSI.reset}`;

const VERSION = '0.5.0-beta';
const CONFIG_DIR = path.join(os.homedir(), '.orlix');

/* ── parse args ── */
const [,, cmd = 'help', ...rest] = process.argv;

/* ── dispatch ── */
const commands = {
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
  '--help':    showHelp,
  '-v':        showVersion,
  '-h':        showHelp,
};

(async () => {
  const handler = commands[cmd];
  if (!handler) {
    logger.error(`Unknown command: ${cmd}`);
    showHelp();
    process.exit(1);
  }
  await handler(rest);
})();

/* ─────────────────────────────────────────────────────────────── */

async function init() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });

  const orlix = new Orlix();

  logger.section('orlix init');
  logger.ok(`Config directory: ${c(ANSI.violet, CONFIG_DIR)}`);
  logger.ok(`Memory:           ${c(ANSI.violet, path.join(CONFIG_DIR, 'memory.json'))}`);
  logger.ok(`Audit log:        ${c(ANSI.violet, path.join(CONFIG_DIR, 'audit.jsonl'))}`);

  const goals = orlix.memory.getGoals();
  if (!goals.length) {
    logger.dim('\nNo goals found. Adding a sample goal…');
    const g = orlix.memory.addGoal({ name: 'Ship MVP', deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10), progress: 0 });
    logger.ok(`Sample goal added: "${g.name}" (id: ${g.id})`);
  }

  const policies = orlix.memory.getPolicies();
  if (!policies.length) {
    logger.dim('\nNo policies found. Adding default policies…');
    const defaults = [
      'alert_if_goal_drift_gt_3d',
      'alert_if_goal_overdue',
      'require_confirm_before_send',
    ];
    defaults.forEach(rule => {
      const p = orlix.memory.addPolicy({ rule });
      logger.ok(`Policy added: ${p.rule} (v${p.version})`);
    });
  }

  logger.section('done');
  logger.info(`Run ${c(ANSI.amber, 'orlix status')} to see your current state.`);
  logger.info(`Run ${c(ANSI.amber, 'orlix run')} to start the governance loop.`);
}

async function status() {
  const orlix = new Orlix();
  const goals    = orlix.memory.getGoals();
  const policies = orlix.memory.getPolicies('active');
  const receipts = orlix.auditLog.list(5);

  logger.section('orlix status');
  logger.ok(`authority tier  ${c(ANSI.amber, 'supervised')} (default)`);
  logger.ok(`memory          ${c(ANSI.violet, path.join(CONFIG_DIR, 'memory.json'))}`);
  logger.ok(`audit log       ${c(ANSI.violet, path.join(CONFIG_DIR, 'audit.jsonl'))}`);

  console.log('');
  logger.info(`Goals: ${c(ANSI.amber, goals.length)}`);
  goals.forEach(g => {
    const pct = Math.round((g.progress ?? 0) * 100);
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    console.log(`  ${c(ANSI.gray, g.id.slice(0,8))}  ${g.name.padEnd(30)} ${c(ANSI.violet, bar)} ${pct}%`);
  });

  console.log('');
  logger.info(`Policies: ${c(ANSI.amber, policies.length)} active`);
  policies.forEach(p => console.log(`  ${c(ANSI.violet, p.rule)}  ${c(ANSI.gray, 'v' + p.version)}`));

  console.log('');
  logger.info(`Recent receipts: ${c(ANSI.amber, receipts.length)}`);
  receipts.forEach(r => {
    const status = r.status === 'verified' ? c(ANSI.green, r.status) : c(ANSI.amber, r.status);
    console.log(`  ${c(ANSI.gray, r.id.slice(0,24))}  ${status}  ${r.intent?.slice(0,50) ?? ''}`);
  });
}

async function run(args) {
  const iFlag    = args.indexOf('--interval');
  const interval = iFlag !== -1 ? parseInt(args[iFlag + 1], 10) * 1000 : 60_000;
  const orlix    = new Orlix();

  logger.section('governance loop — starting');
  logger.info(`Interval:  ${c(ANSI.amber, interval / 1000 + 's')}`);
  logger.info(`Tier:      ${c(ANSI.amber, 'supervised')}`);
  logger.info(`Press ${c(ANSI.amber, 'Ctrl+C')} to stop.\n`);

  orlix.loop.on('observe',  signals  => signals.length  && logger.ok(`Observed ${signals.length} signal(s)`));
  orlix.loop.on('decide',   decisions => decisions.length && logger.ok(`${decisions.length} decision(s) triggered`));
  orlix.loop.on('act',      receipt  => logger.receipt(receipt));
  orlix.loop.on('verify',   receipt  => logger.ok(`Verified: ${receipt.id}`));
  orlix.loop.on('learn',    upd      => logger.ok(`Policy updated: ${upd.policy?.rule} — ${upd.reason}`));
  orlix.loop.on('error',    err      => logger.error(err.message));
  orlix.loop.on('approval_required', d => {
    logger.warn(`Approval required: ${d.intent}`);
    logger.info(`  Run: ${c(ANSI.amber, `orlix approve ${d.id}`)}`);
  });

  process.on('SIGINT', () => {
    logger.dim('\nStopping…');
    orlix.stop();
    process.exit(0);
  });

  orlix.start(interval);
}

async function runTick() {
  const orlix  = new Orlix();
  logger.section('governance loop — single tick');

  const result = await orlix.tick();

  logger.ok(`Signals:   ${result.signals.length}`);
  logger.ok(`Decisions: ${result.decisions.length}`);
  logger.ok(`Receipts:  ${result.receipts.length}`);
  logger.ok(`Updates:   ${result.updates.length}`);

  result.receipts.forEach(r => logger.receipt(r));
  result.updates.forEach(u => logger.ok(`Policy updated: ${u.policy?.rule} — ${u.reason}`));
}

async function memoryCmd(args) {
  const sub = args[0];
  const orlix = new Orlix();

  if (sub === 'list' || !sub) {
    logger.section('memory');
    const goals    = orlix.memory.getGoals();
    const facts    = orlix.memory.getFacts();
    const policies = orlix.memory.getPolicies();

    console.log(`\n${c(ANSI.amber, 'Goals')} (${goals.length})`);
    goals.forEach(g => console.log(`  [${g.id.slice(0,8)}] ${g.name}  ${c(ANSI.gray, g.deadline ?? 'no deadline')}  ${Math.round((g.progress??0)*100)}%`));
    if (!goals.length) console.log(`  ${c(ANSI.gray, '(none)')}`);

    console.log(`\n${c(ANSI.amber, 'Facts')} (${facts.length})`);
    facts.forEach(f => console.log(`  [${f.id.slice(0,8)}] ${f.content}  ${c(ANSI.gray, f.source)}`));
    if (!facts.length) console.log(`  ${c(ANSI.gray, '(none)')}`);

    console.log(`\n${c(ANSI.amber, 'Policies')} (${policies.length})`);
    policies.forEach(p => console.log(`  [${p.id.slice(0,8)}] ${p.rule}  ${c(ANSI.violet, 'v'+p.version)}  ${p.status}`));
    if (!policies.length) console.log(`  ${c(ANSI.gray, '(none)')}`);

  } else if (sub === 'add-goal') {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const q  = p => new Promise(res => rl.question(p, res));
    const name     = await q(c(ANSI.violet, '> name: '));
    const deadline = await q(c(ANSI.violet, '> deadline (YYYY-MM-DD, or blank): '));
    rl.close();
    const goal = orlix.memory.addGoal({ name: name.trim(), deadline: deadline.trim() || null });
    logger.ok(`Goal added: "${goal.name}" (id: ${goal.id})`);

  } else if (sub === 'add-policy') {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const q  = p => new Promise(res => rl.question(p, res));
    const rule = await q(c(ANSI.violet, '> rule (e.g. alert_if_goal_drift_gt_3d): '));
    rl.close();
    const policy = orlix.memory.addPolicy({ rule: rule.trim() });
    logger.ok(`Policy added: ${policy.rule} (v${policy.version})`);

  } else if (sub === 'export') {
    console.log(JSON.stringify(orlix.memory.export(), null, 2));

  } else {
    logger.error(`Unknown memory subcommand: ${sub}`);
    logger.info(`Valid: list, add-goal, add-policy, export`);
  }
}

async function auditCmd(args) {
  const sub   = args[0];
  const orlix = new Orlix();

  if (sub === 'list' || !sub) {
    const limitFlag = args.indexOf('--limit');
    const limit     = limitFlag !== -1 ? parseInt(args[limitFlag + 1], 10) : 20;
    const receipts  = orlix.auditLog.list(limit);

    logger.section(`audit log — last ${receipts.length} receipts`);
    if (!receipts.length) { logger.dim('(empty)'); return; }
    receipts.forEach(r => logger.receipt(r));

  } else if (sub === 'get') {
    const id = args[1];
    if (!id) { logger.error('Usage: orlix audit get <receipt-id>'); return; }
    const r = orlix.auditLog.get(id);
    if (!r) { logger.error(`Receipt not found: ${id}`); return; }
    logger.receipt(r);

  } else {
    logger.error(`Unknown audit subcommand: ${sub}`);
    logger.info(`Valid: list [--limit N], get <id>`);
  }
}

async function policyCmd(args) {
  const sub   = args[0];
  const orlix = new Orlix();

  if (sub === 'list' || !sub) {
    const policies = orlix.memory.getPolicies();
    logger.section('policies');
    if (!policies.length) { logger.dim('(none)'); return; }
    policies.forEach(p => {
      const status = p.status === 'active' ? c(ANSI.green, 'active') : c(ANSI.amber, p.status);
      console.log(`  ${status}  ${c(ANSI.violet, p.rule.padEnd(40))}  ${c(ANSI.gray, 'v' + p.version)}`);
    });
  } else {
    logger.error(`Unknown policy subcommand: ${sub}`);
  }
}

function showVersion() {
  console.log(`orlix v${VERSION}`);
  console.log(`node: ${process.version}`);
  console.log(`https://orlixai.xyz`);
}

function showHelp() {
  const kw = (s) => c(ANSI.amber, s);
  const d  = (s) => c(ANSI.gray,  s);

  console.log(`\n${c(ANSI.bold + ANSI.violet, 'orlix')} ${c(ANSI.gray, 'v' + VERSION)} — personal AI operating system\n`);
  console.log(`${c(ANSI.amber, 'USAGE')}`);
  console.log(`  orlix <command> [options]\n`);
  console.log(`${c(ANSI.amber, 'COMMANDS')}`);
  console.log(`  ${kw('init')}                       ${d('Initialise Orlix (creates memory + default policies)')}`);
  console.log(`  ${kw('status')}                     ${d('Show current status: goals, policies, recent receipts')}`);
  console.log(`  ${kw('run')} [--interval N]         ${d('Start the governance loop (N = seconds, default 60)')}`);
  console.log(`  ${kw('tick')}                       ${d('Run one cycle and exit')}`);
  console.log(`  ${kw('memory list')}                ${d('List goals, facts, policies')}`);
  console.log(`  ${kw('memory add-goal')}            ${d('Add a goal (interactive)')}`);
  console.log(`  ${kw('memory add-policy')}          ${d('Add a policy rule (interactive)')}`);
  console.log(`  ${kw('memory export')}              ${d('Export memory as JSON to stdout')}`);
  console.log(`  ${kw('audit list')} [--limit N]     ${d('Show recent audit receipts')}`);
  console.log(`  ${kw('audit get')} <id>             ${d('Show a specific receipt')}`);
  console.log(`  ${kw('policy list')}                ${d('List all policies')}`);
  console.log(`  ${kw('version')}                    ${d('Show version')}`);
  console.log(`  ${kw('help')}                       ${d('Show this help')}\n`);
  console.log(`${c(ANSI.amber, 'EXAMPLES')}`);
  console.log(`  orlix init`);
  console.log(`  orlix run --interval 30`);
  console.log(`  orlix memory add-goal`);
  console.log(`  orlix audit list --limit 5`);
  console.log(`  orlix memory export > backup.json\n`);
  console.log(`${c(ANSI.gray, 'Docs: https://orlixai.xyz · GitHub: github.com/tylerbroqs/orlixai')}\n`);
}

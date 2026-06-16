#!/usr/bin/env node
/**
 * Orlix CLI — personal AI operating system with governance layer.
 */

import readline from 'readline';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { Orlix } from '../src/index.js';
import { logger } from '../src/utils/logger.js';

const VERSION = '0.5.0-beta';
const CONFIG_DIR = path.join(os.homedir(), '.orlix');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// ── colours ──────────────────────────────────────────────────────────────────
const A = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  amber: '\x1b[38;5;215m',
  orange: '\x1b[38;5;208m',
  violet: '\x1b[38;5;183m',
  green: '\x1b[38;5;114m',
  cyan: '\x1b[38;5;123m',
  red: '\x1b[38;5;203m',
  gray: '\x1b[90m',
  white: '\x1b[97m',
};
const c = (code: string, t: string): string => `${code}${t}${A.reset}`;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── config ────────────────────────────────────────────────────────────────────
interface LLMConfig {
  provider: string;
  model: string;
  key: string;
}
interface OptionalKeys {
  hyperliquid?: string;
  asterdex?: string;
  fred?: string;
  y2?: string;
  elfa?: string;
}
interface AppConfig {
  llm?: LLMConfig;
  keys?: OptionalKeys;
}

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as AppConfig;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function saveConfig(cfg: AppConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

// ── providers & sources ───────────────────────────────────────────────────────
const LLM_PROVIDERS: { id: string; name: string; model: string }[] = [
  { id: 'anthropic', name: 'Anthropic (Claude)', model: 'claude-opus-4-8' },
  { id: 'openai', name: 'OpenAI (GPT)', model: 'gpt-4o' },
  { id: 'google', name: 'Google (Gemini)', model: 'gemini-2.0-flash' },
  { id: 'xai', name: 'xAI (Grok)', model: 'grok-3' },
  { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat' },
  { id: 'zhipu', name: 'Zhipu (GLM)', model: 'glm-4' },
  { id: 'minimax', name: 'Minimax', model: 'abab6.5s-chat' },
  { id: 'moonshot', name: 'Moonshot (Kimi)', model: 'moonshot-v1-128k' },
];

interface DataSource {
  name: string;
  builtin: boolean;
  configKey?: keyof OptionalKeys;
  desc: string;
}
const DATA_SOURCES: DataSource[] = [
  { name: 'CoinGecko', builtin: true, desc: '10,000+ crypto prices + top N + search' },
  { name: 'YFinance', builtin: true, desc: 'stocks + ETFs + analyst recs + news' },
  { name: 'DexScreener', builtin: true, desc: 'DEX pair data + trending + boosted tokens' },
  { name: 'Hyperliquid', builtin: true, desc: 'perp futures + orders + positions' },
  { name: 'FRED', builtin: false, configKey: 'fred', desc: 'CPI, rates, yield curve, VIX' },
  {
    name: 'Y2 Intelligence',
    builtin: false,
    configKey: 'y2',
    desc: 'news sentiment + recaps + reports',
  },
  { name: 'Elfa AI', builtin: false, configKey: 'elfa', desc: 'trending tokens + social mentions' },
  {
    name: 'Aster DEX',
    builtin: false,
    configKey: 'asterdex',
    desc: 'futures + orderbook + klines + leverage',
  },
];

// ── pixel-art banner ("ORLIX") ────────────────────────────────────────────────
// Each letter: 5-wide × 7-tall, 1 = amber block, 0 = dark space.
const BANNER = ((): string => {
  const LIT = `\x1b[48;5;215m  ${A.reset}`;
  const DRK = '  ';
  const G = [
    // O
    [
      [0, 1, 1, 1, 0],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
    ],
    // R
    [
      [1, 1, 1, 1, 0],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 0],
      [1, 1, 0, 0, 0],
      [1, 0, 1, 0, 0],
      [1, 0, 0, 1, 0],
    ],
    // L
    [
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ],
    // I
    [
      [1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ],
    // X
    [
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [0, 1, 0, 1, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 0, 1, 0],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
    ],
  ];
  const rows: string[] = [];
  for (let r = 0; r < 7; r++) {
    let line = DRK;
    for (let li = 0; li < G.length; li++) {
      if (li > 0) line += DRK;
      for (const p of G[li][r]) line += p ? LIT : DRK;
    }
    rows.push(line);
  }
  return ['', ...rows].join('\n');
})();

// ── BYOK setup wizard ─────────────────────────────────────────────────────────
function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function runSetup(rl: readline.Interface, cfg: AppConfig): Promise<AppConfig> {
  const next = { ...cfg };
  console.log();
  console.log(c(A.bold + A.amber, '  ORLIX SETUP — Bring Your Own Key'));
  console.log(c(A.gray, '  ─────────────────────────────────────────────'));
  console.log();
  console.log(c(A.gray, '  Select your LLM provider:\n'));

  LLM_PROVIDERS.forEach((p, i) => {
    console.log(`    ${c(A.amber, String(i + 1) + '.')}  ${c(A.white, p.name)}`);
  });
  console.log(`    ${c(A.gray, String(LLM_PROVIDERS.length + 1) + '.  Skip for now')}`);
  console.log();

  const choice = await ask(rl, `  ${c(A.amber, '›')} Choice [1-${LLM_PROVIDERS.length + 1}]: `);
  const idx = parseInt(choice.trim(), 10) - 1;

  if (idx >= 0 && idx < LLM_PROVIDERS.length) {
    const provider = LLM_PROVIDERS[idx];
    if (provider) {
      const key = await ask(rl, `  ${c(A.amber, '›')} API key for ${provider.name}: `);
      if (key.trim()) {
        next.llm = { provider: provider.id, model: provider.model, key: key.trim() };
        console.log();
        console.log(
          `  ${c(A.green, '✓')} LLM configured: ${c(A.amber, provider.name)} → ${c(A.gray, provider.model)}`,
        );
      }
    }
  }

  // optional keys
  console.log();
  console.log(c(A.gray, '  Optional data source keys (press Enter to skip):\n'));
  const optSources = DATA_SOURCES.filter((s) => !s.builtin);
  const nextKeys: OptionalKeys = { ...next.keys };

  for (const src of optSources) {
    const val = await ask(rl, `  ${c(A.gray, '›')} ${src.name.padEnd(18)} API key: `);
    if (val.trim() && src.configKey) nextKeys[src.configKey] = val.trim();
  }

  next.keys = nextKeys;
  saveConfig(next);
  console.log();
  console.log(`  ${c(A.green, '✓')} Config saved → ${c(A.gray, CONFIG_FILE)}`);
  console.log();
  return next;
}

// ── boot sequence ─────────────────────────────────────────────────────────────
async function bootSequence(orlix: Orlix, cfg: AppConfig): Promise<void> {
  const step = async (icon: string, label: string, detail: string): Promise<void> => {
    await sleep(80);
    process.stdout.write(
      `  ${c(A.green, '✓')} ${icon}  ${c(A.bold + A.amber, label.padEnd(26))} ${c(A.gray, '—')} ${c(A.gray, detail)}\n`,
    );
  };

  const goals = orlix.memory.getGoals().length;
  const facts = orlix.memory.getFacts().length;
  const policies = orlix.memory.getPolicies('active').length;

  await step('🧠', 'Loading memory', `${goals} goals · ${facts} facts · ${policies} policies`);
  await step('⚙️ ', 'Initializing engine', 'governance loop ready');
  await step(
    '🔑',
    'Loading credentials',
    fs.existsSync(CONFIG_FILE) ? CONFIG_FILE : 'no config — run /setup',
  );

  const builtinNames = DATA_SOURCES.filter((s) => s.builtin)
    .map((s) => s.name)
    .join(' · ');
  await step('📊', 'Connecting data sources', builtinNames);

  const connectedOptional = DATA_SOURCES.filter(
    (s) => !s.builtin && s.configKey && cfg.keys?.[s.configKey],
  ).map((s) => s.name);
  if (connectedOptional.length) {
    await step('🔗', 'Connecting optional', connectedOptional.join(' · '));
  }

  console.log();
  if (cfg.llm) {
    const prov = LLM_PROVIDERS.find((p) => p.id === cfg.llm!.provider);
    console.log(
      `  ${c(A.green, '✓')} LLM: ${c(A.bold + A.amber, (prov?.name ?? cfg.llm.provider).toUpperCase())} ${c(A.gray, '→')} ${c(A.violet, cfg.llm.model)}`,
    );
  } else {
    console.log(
      `  ${c(A.gray, '✗')} LLM: ${c(A.gray, 'not configured')}  ${c(A.amber, '→ run /setup to add your key')}`,
    );
  }
  console.log();
}

// ── dashboard ─────────────────────────────────────────────────────────────────
function showDashboard(orlix: Orlix, cfg: AppConfig): void {
  const goals = orlix.memory.getGoals().length;
  const facts = orlix.memory.getFacts().length;
  const policies = orlix.memory.getPolicies('active').length;

  const dot = (on: boolean): string => (on ? c(A.green, '●') : c(A.gray, '○'));
  const avail = (on: boolean): string =>
    on ? c(A.green, 'Always available') : c(A.gray, 'No key — /setup');

  // ── infrastructure ─────────────────────────────────────────────────────────
  console.log(c(A.bold + A.amber, '  🔌 Infrastructure'));
  console.log(c(A.gray, '  ' + '─'.repeat(70)));

  const infRow = (name: string, dot_: string, tag: string, detail: string): void => {
    console.log(
      `    ${c(A.white, name.padEnd(14))} ${dot_}  ${c(A.violet, tag.padEnd(22))} ${c(A.gray, detail)}`,
    );
  };

  const llmTag = cfg.llm ? cfg.llm.model : 'not configured';
  const llmDetail = cfg.llm
    ? `${LLM_PROVIDERS.find((p) => p.id === cfg.llm!.provider)?.name ?? cfg.llm.provider} — Ready`
    : 'run /setup to add key';
  infRow('LLM', dot(!!cfg.llm), llmTag, llmDetail);
  infRow(
    'Memory',
    dot(true),
    '~/.orlix/memory',
    `${goals} goals · ${facts} facts · ${policies} policies`,
  );
  infRow('Audit Log', dot(true), '~/.orlix/audit', 'full immutable trail');
  infRow('Governance', dot(true), 'supervised tier', 'observe→decide→act→verify→learn');
  console.log();

  // ── data sources ───────────────────────────────────────────────────────────
  console.log(c(A.bold + A.amber, '  📊 Data Sources'));
  console.log(c(A.gray, '  ' + '─'.repeat(70)));

  let connected = 0;
  for (const src of DATA_SOURCES) {
    const hasKey = src.builtin || !!(src.configKey && cfg.keys?.[src.configKey]);
    if (hasKey) connected++;
    console.log(
      `    ${c(A.white, src.name.padEnd(18))} ${avail(hasKey).padEnd(0)}   ${c(A.gray, src.desc)}`,
    );
  }
  console.log();
  console.log(
    `  ${c(A.gray, String(connected) + ' data source' + (connected === 1 ? '' : 's') + ' connected')}`,
  );
  console.log();
}

// ── print startup header ──────────────────────────────────────────────────────
function printHeader(): void {
  console.log(BANNER);
  console.log();
  console.log(c(A.bold + A.amber, '  O  R  L  I  X'));
  console.log(c(A.gray, `  Personal AI Operating System · Governance Layer · v${VERSION}`));
  console.log();
}

// ── visual governance tick ────────────────────────────────────────────────────
async function visualTick(orlix: Orlix): Promise<void> {
  const stepFn = async (icon: string, label: string, fn: () => Promise<string>): Promise<void> => {
    process.stdout.write(
      `  ${c(A.gray, icon)} ${c(A.violet, label.padEnd(10))} ${c(A.gray, '▸')} `,
    );
    await sleep(120);
    console.log(await fn());
  };

  console.log();
  console.log(c(A.gray, '  ── governance cycle ──────────────────────'));

  let signals = 0;
  let decisions = 0;
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
    console.log(`\n    ${c(A.amber, '→')} ${r.intent ?? ''}`);
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

  await orlix.loop.tick();

  await stepFn('○', 'observe', () =>
    Promise.resolve(
      signals > 0 ? c(A.green, `${signals} signal(s) collected`) : c(A.gray, 'no external signals'),
    ),
  );
  await stepFn('○', 'decide', () =>
    Promise.resolve(
      decisions > 0
        ? c(A.amber, `${decisions} decision(s) queued`)
        : c(A.gray, 'no actions needed'),
    ),
  );
  await stepFn('○', 'act', () =>
    Promise.resolve(
      receipts.length > 0
        ? c(A.amber, `${receipts.length} action(s) executed`)
        : c(A.gray, 'nothing to execute'),
    ),
  );
  await stepFn('○', 'verify', () =>
    Promise.resolve(
      receipts.length > 0 ? c(A.green, 'all receipts verified') : c(A.gray, 'nothing to verify'),
    ),
  );
  await stepFn('○', 'learn', () => Promise.resolve(c(A.gray, 'memory updated')));

  console.log(c(A.gray, '\n  ── cycle complete ─────────────────────────'));
  console.log();
}

// ── natural language parser ───────────────────────────────────────────────────
function handleNL(line: string, orlix: Orlix): boolean {
  const lower = line.toLowerCase().trim();

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

  const factMatch = lower.match(/^(add fact|fact:?)\s+(.+)/i);
  if (factMatch) {
    const content = line.slice(factMatch[1].length).trim();
    const fact = orlix.memory.addFact({ content, source: 'user' });
    console.log(`  ${c(A.green, '+')} Fact stored: ${c(A.violet, fact.content)}`);
    return true;
  }

  const policyMatch = lower.match(/^(add policy|policy:?)\s+(.+)/i);
  if (policyMatch) {
    const rule = line.slice(policyMatch[1].length).trim();
    const policy = orlix.memory.addPolicy({ rule });
    console.log(
      `  ${c(A.green, '+')} Policy added: ${c(A.violet, policy.rule)} ${c(A.gray, 'v' + policy.version)}`,
    );
    return true;
  }

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

  if (/^(goals?|show goals?|my goals?|list goals?)/.test(lower)) {
    showGoalsInline(orlix);
    return true;
  }
  if (/^(policies|show policies|list policies)/.test(lower)) {
    showPoliciesInline(orlix);
    return true;
  }
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
    const dl = g.deadline ? new Date(g.deadline).getTime() : null;
    const overdue = dl && dl < Date.now();
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

// ── help ──────────────────────────────────────────────────────────────────────
function printShellHelp(): void {
  const kw = (s: string): string => c(A.amber, s);
  const d = (s: string): string => c(A.gray, s);
  const row = (k: string, v: string): void =>
    console.log(`  ${c(A.amber, k.padEnd(30))} ${c(A.gray, v)}`);

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
  row('/tick', 'Run one governance cycle');
  row('/run [--interval N]', 'Start continuous loop every N seconds');
  row('/status', 'Full system status');
  row('/audit', 'View recent audit receipts');
  row('/memory export', 'Dump memory as JSON');
  row('/setup', 'Configure LLM key + data source keys');
  row('/keys', 'Show connected data sources');
  row('/clear', 'Clear screen');
  row('/exit', 'Quit');
  console.log();
}

// ── auto-seed ─────────────────────────────────────────────────────────────────
function autoSeed(orlix: Orlix): void {
  if (orlix.memory.getGoals().length > 0) return;
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const d30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const d_2 = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  orlix.memory.addGoal({ name: 'Ship public beta', deadline: d30, progress: 0.6 });
  orlix.memory.addGoal({ name: 'Write onboarding docs', deadline: d_2, progress: 0.2 });
  orlix.memory.addGoal({ name: 'Set up analytics pipeline', progress: 0.9 });
  orlix.memory.addFact({ content: 'team size: 3 engineers, 1 designer', source: 'user' });
  orlix.memory.addPolicy({ rule: 'alert_if_goal_overdue' });
  orlix.memory.addPolicy({ rule: 'alert_if_goal_drift_gt_3d' });
  console.log(c(A.gray, `  ✦ first run — seeded sample goals & policies`));
}

// ── full status ───────────────────────────────────────────────────────────────
function printFullStatus(orlix: Orlix): void {
  const goals = orlix.memory.getGoals();
  const policies = orlix.memory.getPolicies('active');
  const receipts = orlix.auditLog.list(5);
  const now = Date.now();

  console.log(`\n${c(A.violet, 'Goals')}`);
  if (!goals.length) console.log(c(A.gray, '  (none)'));
  goals.forEach((g) => {
    const pct = Math.round((g.progress ?? 0) * 100);
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    const dl = g.deadline ? new Date(g.deadline).getTime() : null;
    const overdue = dl && dl < now;
    console.log(
      `  ${c(A.amber, g.name.padEnd(32))} ${c(A.violet, bar)} ${String(pct).padStart(3)}%${overdue ? c(A.red, ' ⚠ overdue') : ''}`,
    );
  });

  console.log(`\n${c(A.violet, 'Active policies')}`);
  if (!policies.length) console.log(c(A.gray, '  (none)'));
  policies.forEach((p) =>
    console.log(`  ${c(A.green, '●')} ${c(A.violet, p.rule)}  ${c(A.gray, 'v' + p.version)}`),
  );

  console.log(`\n${c(A.violet, 'Recent receipts')}`);
  if (!receipts.length) console.log(c(A.gray, '  (none — run /tick to generate)'));
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
  orlix.loop.on('approval_required', (d: { intent: string }) =>
    console.log(`  ${c(A.amber, '⏸ approval needed:')} ${d.intent}`),
  );
  process.once('SIGINT', () => {
    orlix.stop();
    console.log(c(A.gray, '\n  loop stopped.'));
  });
  orlix.start(interval);
}

// ── main interactive shell ────────────────────────────────────────────────────
function startShell(): Promise<void> {
  return new Promise<void>((resolve) => {
    let cfg = loadConfig();

    const orlix = new Orlix({
      memoryPath: path.join(CONFIG_DIR, 'memory.json'),
      auditPath: path.join(CONFIG_DIR, 'audit.jsonl'),
    });
    autoSeed(orlix);

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
      '/setup',
      '/keys',
      '/clear',
      '/help',
      '/exit',
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

    const doPrompt = (): void => {
      rl.question(
        `\n${c(A.amber, '⚡')} ${c(A.bold + A.amber, 'You')} ${c(A.gray, '→')} `,
        (raw: string) => {
          const line = raw.trim();
          if (!line) {
            doPrompt();
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
            printHeader();
            showDashboard(orlix, cfg);
            doPrompt();
            return;
          }
          void dispatchCommand(line, orlix, cfg, rl).then((newCfg) => {
            if (newCfg) cfg = newCfg;
            doPrompt();
          });
        },
      );
    };

    process.on('SIGINT', () => {
      console.log(c(A.gray, '\n\nGoodbye.\n'));
      rl.close();
      resolve();
    });

    // boot
    printHeader();
    void (async (): Promise<void> => {
      await bootSequence(orlix, cfg);
      showDashboard(orlix, cfg);
      console.log(
        `  ${c(A.gray, 'Type a command')} · ${c(A.amber, '/help')} ${c(A.gray, 'for reference')} · ${c(A.amber, '/setup')} ${c(A.gray, 'to configure LLM key')}`,
      );
      doPrompt();
    })();
  });
}

async function dispatchCommand(
  line: string,
  orlix: Orlix,
  cfg: AppConfig,
  rl: readline.Interface,
): Promise<AppConfig | null> {
  const lower = line.toLowerCase();

  if (
    line.startsWith('/') ||
    /^(help|status|tick|run|audit|memory|version|setup|keys)(\s|$)/.test(lower)
  ) {
    const [cmd, ...args] = line.replace(/^\//, '').split(/\s+/);
    switch (cmd?.toLowerCase()) {
      case 'help':
        printShellHelp();
        return null;
      case 'version':
        console.log(`orlix v${VERSION}  node: ${process.version}`);
        return null;
      case 'status':
        printFullStatus(orlix);
        return null;
      case 'tick':
        await visualTick(orlix);
        return null;
      case 'run':
        startLoop(orlix, args);
        return null;
      case 'audit':
        printAudit(orlix, args);
        return null;
      case 'memory':
        if (args[0] === 'export') {
          console.log(JSON.stringify(orlix.memory.export(), null, 2));
        } else {
          showGoalsInline(orlix);
          showFactsInline(orlix);
          showPoliciesInline(orlix);
        }
        return null;
      case 'setup': {
        const newCfg = await runSetup(rl, cfg);
        return newCfg;
      }
      case 'keys': {
        console.log();
        DATA_SOURCES.forEach((s) => {
          const ok = s.builtin || !!(s.configKey && cfg.keys?.[s.configKey]);
          console.log(
            `  ${ok ? c(A.green, '●') : c(A.gray, '○')}  ${c(A.white, s.name.padEnd(18))}  ${c(A.gray, s.desc)}`,
          );
        });
        console.log();
        return null;
      }
    }
  }

  const handled = handleNL(line, orlix);
  if (!handled)
    console.log(`  ${c(A.gray, 'Unknown input.')} Type ${c(A.amber, '/help')} for commands.`);
  return null;
}

// ── one-shot commands ─────────────────────────────────────────────────────────
const [, , cmd, ...rest] = process.argv;
type CmdFn = (args: string[]) => void | Promise<void>;

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
  console.log(`  ${kw('orlix setup')}             ${d('configure LLM key + data source keys')}`);
  console.log(`  ${kw('orlix status')}             ${d('print status and exit')}`);
  console.log(`  ${kw('orlix tick')}               ${d('run one governance cycle and exit')}`);
  console.log(`  ${kw('orlix run [--interval N]')} ${d('start continuous loop (N seconds)')}`);
  console.log(`  ${kw('orlix version')}            ${d('show version')}\n`);
}

async function setupCmd(_args: string[]): Promise<void> {
  const cfg = loadConfig();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await runSetup(rl, cfg);
  rl.close();
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
  setup: setupCmd,
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

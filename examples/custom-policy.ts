/**
 * Custom policy example.
 *
 * Shows how to register your own policy rules and action handlers
 * without touching the Orlix core.
 *
 * Run:  npx tsx examples/custom-policy.ts
 */

import path from 'path';
import os from 'os';
import { Orlix } from '../src/index.js';
import type { WorldModel } from '../src/core/WorldModel.js';
import { logger } from '../src/utils/logger.js';

/* ── setup ── */
const orlix = new Orlix({
  tier: 'supervised',
  memoryPath: path.join(os.tmpdir(), 'orlix-custom-memory.json'),
  auditPath: path.join(os.tmpdir(), 'orlix-custom-audit.jsonl'),
});

/* ── register a custom policy rule ── */
orlix.policyEngine.register('weekly_review_reminder', (worldModel: WorldModel) => {
  const today = new Date().getDay();
  if (today !== 5) return null;

  const incomplete = worldModel.goals.filter((g) => (g.progress ?? 0) < 1);
  if (!incomplete.length) return null;

  return {
    intent: `Weekly review: ${incomplete.length} goal(s) still in progress`,
    context: incomplete.map((g) => g.name).join(', '),
    action: 'send_weekly_review',
    priority: 6,
  };
});

logger.section('custom policy registered');
logger.info('Rule: weekly_review_reminder (triggers on Fridays)');

/* ── register action handler ── */
orlix.use('send_weekly_review', {
  execute: async (decision) => {
    logger.warn(`Weekly review: ${decision.context ?? ''}`);
  },
  verify: async () => 'weekly review sent',
});

/* ── add test data ── */
orlix.memory.addGoal({ name: 'Write blog post', progress: 0.3 });
orlix.memory.addGoal({ name: 'Refactor auth module', progress: 0.7 });
orlix.memory.addPolicy({ rule: 'weekly_review_reminder' });

/* ── run ── */
logger.section('running tick');
orlix.loop.on('act', (r: never) => logger.receipt(r));
orlix.loop.on('decide', (d: unknown[]) => d.forEach((x) => logger.decision(x as never)));

const result = await orlix.tick();
logger.section('done');
logger.ok(
  `Signals: ${result.signals.length}  Decisions: ${result.decisions.length}  Actions: ${result.receipts.length}`,
);

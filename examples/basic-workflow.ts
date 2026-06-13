/**
 * Basic Orlix workflow example.
 *
 * Demonstrates:
 *   1. Creating goals and policies in memory
 *   2. Injecting signals from integrations
 *   3. Running the governance loop
 *   4. Listening to loop events (act, verify, learn)
 *   5. Exporting memory to JSON
 *
 * Run:  npx tsx examples/basic-workflow.ts
 */

import path from 'path';
import os from 'os';
import { Orlix } from '../src/index.js';
import { CalendarIntegration } from '../src/integrations/CalendarIntegration.js';
import { EmailIntegration } from '../src/integrations/EmailIntegration.js';
import { logger } from '../src/utils/logger.js';

/* ── 1. create Orlix instance ───────────────────────────────── */
const orlix = new Orlix({
  tier: 'supervised',
  memoryPath: path.join(os.tmpdir(), 'orlix-example-memory.json'),
  auditPath: path.join(os.tmpdir(), 'orlix-example-audit.jsonl'),
});

/* ── 2. set up goals and policies ───────────────────────────── */
logger.section('setting up goals and policies');

const goal = orlix.memory.addGoal({
  name: 'Ship MVP',
  deadline: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
  progress: 0.6,
});
logger.ok(`Goal: "${goal.name}" — deadline was ${goal.deadline}`);

const p1 = orlix.memory.addPolicy({ rule: 'alert_if_goal_drift_gt_3d' });
const p2 = orlix.memory.addPolicy({ rule: 'alert_if_goal_overdue' });
const p3 = orlix.memory.addPolicy({ rule: 'summarise_email_on_wake' });
logger.ok(`Policies: ${p1.rule}, ${p2.rule}, ${p3.rule}`);

/* ── 3. register integrations ───────────────────────────────── */
logger.section('registering integrations');

const calendar = new CalendarIntegration({
  events: [
    {
      title: 'MVP review call',
      startTime: new Date(Date.now() + 10 * 60_000).toISOString(),
      endTime: new Date(Date.now() + 70 * 60_000).toISOString(),
      blocksWork: true,
      durationMinutes: 60,
    },
  ],
});

const email = new EmailIntegration({
  inbox: [
    {
      from: 'alice@example.com',
      subject: 'Re: launch plan',
      preview: "LGTM, let's ship!",
      read: false,
      receivedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    },
    {
      from: 'bob@example.com',
      subject: 'Blocker on auth',
      preview: 'The OAuth is broken.',
      read: false,
      receivedAt: new Date(Date.now() - 30 * 3_600_000).toISOString(),
    },
  ],
  replyThresholdHours: 24,
});

await calendar.connect();
await email.connect();
logger.ok('Calendar integration connected');
logger.ok('Email integration connected');

orlix.use('send_calendar_reminder', calendar);
orlix.use('summarise_inbox', email);
orlix.use('send_priority_alert', {
  execute: async (d) => {
    logger.warn(`ALERT: ${d.intent}`);
  },
  verify: async () => 'alert delivered to user',
});
orlix.use('send_overdue_alert', {
  execute: async (d) => {
    logger.warn(`OVERDUE: ${d.intent}`);
  },
  verify: async () => 'overdue alert delivered',
});

/* ── 4. listen to loop events ───────────────────────────────── */
logger.section('governance loop events');

orlix.loop.on('observe', (signals: unknown[]) => logger.ok(`Observed ${signals.length} signal(s)`));
orlix.loop.on('decide', (decisions: unknown[]) =>
  logger.ok(`${decisions.length} decision(s) from policy engine`),
);
orlix.loop.on('act', (receipt: unknown) => {
  console.log('');
  logger.receipt(receipt as never);
});
orlix.loop.on('verify', (receipt: { id: string }) => logger.ok(`Verified receipt: ${receipt.id}`));
orlix.loop.on('learn', (upd: { policy?: { rule: string }; reason: string }) =>
  logger.ok(`Policy update: ${upd.policy?.rule} — ${upd.reason}`),
);
orlix.loop.on('error', (err: Error) => logger.error(err.message));

/* ── 5. run one governance cycle ────────────────────────────── */
logger.section('running one governance cycle');

const result = await orlix.tick();

console.log('');
logger.section('cycle summary');
logger.ok(`Signals collected: ${result.signals.length}`);
logger.ok(`Decisions made:    ${result.decisions.length}`);
logger.ok(`Actions taken:     ${result.receipts.length}`);
logger.ok(`Policy updates:    ${result.updates.length}`);

/* ── 6. export memory ───────────────────────────────────────── */
console.log('');
logger.section('memory export');
const exported = orlix.memory.export();
console.log(JSON.stringify(exported, null, 2));

/* ── 7. audit trail ─────────────────────────────────────────── */
console.log('');
logger.section('audit log');
const receipts = orlix.auditLog.list(10);
receipts.forEach((r) => logger.receipt(r));

logger.dim('\nDone. To persist, use a non-tmp memory path.');

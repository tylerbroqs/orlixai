import type { WorldModel } from '../core/WorldModel.js';

// ─── Authority Tiers ────────────────────────────────────────────────────────

export type TierName = 'observe' | 'suggest' | 'confirm' | 'supervised' | 'autonomous';

export interface Tier {
  name: TierName;
  level: number;
}

// ─── Memory ─────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  name: string;
  deadline: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Fact {
  id: string;
  content: string;
  source: string;
  confidence: number;
  createdAt: string;
}

export interface Policy {
  id: string;
  rule: string;
  version: number;
  status: 'active' | 'paused' | 'archived';
  priority?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryStore {
  schema: string;
  goals: Goal[];
  facts: Fact[];
  policies: Policy[];
}

export interface MemoryExport extends MemoryStore {
  exported_at: string;
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export type ReceiptStatus = 'pending' | 'verified' | 'failed' | 'rolled_back';

export interface Receipt {
  id: string;
  timestamp: string;
  intent: string;
  context: string;
  policy?: string;
  policyVersion?: number;
  action: string;
  approval: 'auto' | 'user_confirmed' | 'skipped';
  outcome?: string;
  status: ReceiptStatus;
  rollback: {
    available: boolean;
    expiresAt: string;
  };
}

// ─── World Model ─────────────────────────────────────────────────────────────

export interface Signal {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface WorldSnapshot {
  timestamp: string;
  goals: Goal[];
  facts: Fact[];
  signals: Signal[];
  policies: Policy[];
}

// ─── Policy Engine ───────────────────────────────────────────────────────────

export interface Decision {
  id?: string;
  intent: string;
  context: string;
  action: string;
  priority: number;
  policy: string;
  policyVersion: number;
  payload?: Record<string, unknown>;
}

export type Evaluator = (worldModel: WorldModel, policy: Policy) => Decision | null;

// ─── Governance Loop ─────────────────────────────────────────────────────────

export interface LoopResult {
  signals: Signal[];
  decisions: Decision[];
  receipts: Receipt[];
  updates: PolicyUpdate[];
}

export interface PolicyUpdate {
  policy: Policy;
  reason: string;
}

export interface ActionHandler {
  observe?: () => Promise<Omit<Signal, 'id'>[]>;
  execute?: (decision: Decision, receipt: Receipt) => Promise<void>;
  verify?: (receipt: Receipt) => Promise<string>;
}

// ─── Integration ─────────────────────────────────────────────────────────────

export interface CalendarEvent {
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  blocksWork?: boolean;
  durationMinutes?: number;
}

export interface EmailMessage {
  from: string;
  subject: string;
  preview?: string;
  read: boolean;
  receivedAt: string;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export interface OrlixConfig {
  tier?: TierName;
  memoryPath?: string;
  auditPath?: string;
}

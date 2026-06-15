import { EventEmitter } from 'events';
import { DEFAULT_TIER, canActWithoutApproval } from './AuthorityTier.js';
import type {
  Tier,
  Decision,
  Receipt,
  PolicyUpdate,
  LoopResult,
  ActionHandler,
  Policy,
} from '../types/index.js';
import type { WorldModel } from './WorldModel.js';
import type { PolicyEngine } from './PolicyEngine.js';
import type { Memory } from './Memory.js';
import type { AuditLog } from './AuditLog.js';

export interface GovernanceLoopOptions {
  worldModel: WorldModel;
  policyEngine: PolicyEngine;
  memory: Memory;
  auditLog: AuditLog;
  tier?: Tier;
  actionHandlers?: Map<string, ActionHandler>;
}

export class GovernanceLoop extends EventEmitter {
  readonly worldModel: WorldModel;
  readonly policyEngine: PolicyEngine;
  readonly memory: Memory;
  readonly auditLog: AuditLog;
  readonly tier: Tier;
  readonly actionHandlers: Map<string, ActionHandler>;

  private _running = false;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _pending: Decision[] = [];

  constructor(opts: GovernanceLoopOptions) {
    super();
    this.worldModel = opts.worldModel;
    this.policyEngine = opts.policyEngine;
    this.memory = opts.memory;
    this.auditLog = opts.auditLog;
    this.tier = opts.tier ?? DEFAULT_TIER;
    this.actionHandlers = opts.actionHandlers ?? new Map<string, ActionHandler>();
  }

  // ── public ─────────────────────────────────────────────────────────────────

  async tick(): Promise<LoopResult> {
    const result: LoopResult = { signals: [], decisions: [], receipts: [], updates: [] };
    try {
      result.signals = await this._observe();
      result.decisions = this._decide();
      result.receipts = await this._act(result.decisions);
      await this._verify(result.receipts);
      result.updates = this._learn(result.receipts);
    } catch (err) {
      this.emit('error', err);
    }
    return result;
  }

  start(intervalMs = 60_000): this {
    if (this._running) return this;
    this._running = true;
    this._intervalId = setInterval(() => void this.tick(), intervalMs);
    void this.tick();
    return this;
  }

  stop(): this {
    if (this._intervalId) clearInterval(this._intervalId);
    this._running = false;
    return this;
  }

  get running(): boolean {
    return this._running;
  }

  approve(decisionId: string): Promise<Receipt> {
    const idx = this._pending.findIndex((d) => d.id === decisionId);
    if (idx === -1) throw new Error(`No pending decision: ${decisionId}`);
    const [decision] = this._pending.splice(idx, 1);
    return this._execute(decision, 'user_confirmed');
  }

  pendingApprovals(): Decision[] {
    return [...this._pending];
  }

  // ── steps ──────────────────────────────────────────────────────────────────

  private async _observe(): Promise<LoopResult['signals']> {
    const signals: LoopResult['signals'] = [];
    for (const [, handler] of this.actionHandlers) {
      if (typeof handler?.observe === 'function') {
        try {
          const s = await handler.observe();
          s.forEach((sig) => {
            this.worldModel.ingestSignal(sig);
            signals.push(this.worldModel.signals[0]);
          });
        } catch (err) {
          this.emit('error', new Error(`observe failed: ${(err as Error).message}`));
        }
      }
    }
    this.emit('observe', signals);
    return signals;
  }

  private _decide(): Decision[] {
    this.worldModel.loadFromMemory(this.memory);
    const decisions = this.policyEngine
      .evaluate(this.worldModel)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.emit('decide', decisions);
    return decisions;
  }

  private async _act(decisions: Decision[]): Promise<Receipt[]> {
    const receipts: Receipt[] = [];
    for (const decision of decisions) {
      decision.id = `pend-${Date.now().toString(36)}`;
      if (canActWithoutApproval(this.tier)) {
        receipts.push(await this._execute(decision, 'auto'));
      } else {
        this._pending.push(decision);
        this.emit('approval_required', decision);
      }
    }
    return receipts;
  }

  private async _verify(receipts: Receipt[]): Promise<void> {
    for (const receipt of receipts) {
      try {
        const handler = this.actionHandlers.get(receipt.action);
        const outcome = handler?.verify ? await handler.verify(receipt) : 'completed';
        this.auditLog.verify(receipt.id, outcome);
        receipt.outcome = outcome;
        receipt.status = 'verified';
        this.emit('verify', receipt);
      } catch (err) {
        this.auditLog.fail(receipt.id, (err as Error).message);
        receipt.status = 'failed';
        this.emit('error', err);
      }
    }
  }

  private _learn(receipts: Receipt[]): PolicyUpdate[] {
    const updates: PolicyUpdate[] = [];
    for (const receipt of receipts) {
      if (receipt.status !== 'verified') continue;
      for (const policy of this.worldModel.activePolicies()) {
        if (policy.rule !== receipt.policy) continue;
        const fb = this._feedback(receipt);
        if (!fb) continue;
        const updated = this.memory.updatePolicy(policy.id, fb.patch);
        const upd: PolicyUpdate = { policy: updated, reason: fb.learnReason };
        updates.push(upd);
        this.emit('learn', upd);
      }
    }
    return updates;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async _execute(decision: Decision, approval: Receipt['approval']): Promise<Receipt> {
    const receipt = this.auditLog.write({
      intent: decision.intent,
      context: decision.context,
      policy: decision.policy,
      action: decision.action,
      approval,
    });
    this.emit('act', receipt);
    const handler = this.actionHandlers.get(decision.action);
    if (handler?.execute) {
      try {
        await handler.execute(decision, receipt);
      } catch (err) {
        this.auditLog.fail(receipt.id, (err as Error).message);
        throw err;
      }
    }
    return receipt;
  }

  private _feedback(
    receipt: Receipt,
  ): { patch: Partial<Omit<Policy, 'id' | 'createdAt'>>; learnReason: string } | null {
    if (receipt.outcome?.includes('confirmed'))
      return { patch: {}, learnReason: 'user confirmed — policy reinforced' };
    if (receipt.outcome?.includes('rejected') || receipt.outcome?.includes('override'))
      return {
        patch: { status: 'paused' },
        learnReason: 'user rejected — policy paused for review',
      };
    return null;
  }
}

export default GovernanceLoop;

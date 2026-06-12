import { EventEmitter }  from 'events';
import { DEFAULT_TIER, canActWithoutApproval } from './AuthorityTier.js';

/**
 * GovernanceLoop — the core 5-step loop that runs Orlix.
 *
 * Steps:
 *   1. observe  — ingest signals from integrations into the world model
 *   2. decide   — evaluate policies → produce decisions
 *   3. act      — execute approved decisions (or queue for confirmation)
 *   4. verify   — check outcomes against intent
 *   5. learn    — update policies based on feedback signals
 *
 * Emits events at each stage so you can hook into any step:
 *   'observe'  (signals)
 *   'decide'   (decisions)
 *   'act'      (receipt)
 *   'verify'   (receipt)
 *   'learn'    (policy_update)
 *   'error'    (err)
 */
export class GovernanceLoop extends EventEmitter {
  /**
   * @param {object} opts
   * @param {import('./WorldModel.js').WorldModel}   opts.worldModel
   * @param {import('./PolicyEngine.js').PolicyEngine} opts.policyEngine
   * @param {import('./Memory.js').Memory}           opts.memory
   * @param {import('./AuditLog.js').AuditLog}       opts.auditLog
   * @param {{ name: string, level: number }}        [opts.tier]
   * @param {Map<string, function>}                  [opts.actionHandlers]
   */
  constructor({ worldModel, policyEngine, memory, auditLog, tier = DEFAULT_TIER, actionHandlers = new Map() }) {
    super();
    this.worldModel     = worldModel;
    this.policyEngine   = policyEngine;
    this.memory         = memory;
    this.auditLog       = auditLog;
    this.tier           = tier;
    this.actionHandlers = actionHandlers;
    this._running       = false;
    this._intervalId    = null;
    this._pendingApprovals = [];
  }

  /* ── PUBLIC API ─────────────────────────────────────────────── */

  /**
   * Run one full cycle of the governance loop.
   * @returns {Promise<LoopResult>}
   */
  async tick() {
    const result = { signals: [], decisions: [], receipts: [], updates: [] };

    try {
      result.signals   = await this._observe();
      result.decisions = await this._decide();
      result.receipts  = await this._act(result.decisions);
      await this._verify(result.receipts);
      result.updates   = await this._learn(result.receipts);
    } catch (err) {
      this.emit('error', err);
    }

    return result;
  }

  /**
   * Start the loop on a recurring interval.
   * @param {number} intervalMs — default 60 seconds
   */
  start(intervalMs = 60_000) {
    if (this._running) return this;
    this._running   = true;
    this._intervalId = setInterval(() => this.tick(), intervalMs);
    this.tick();
    return this;
  }

  /** Stop the recurring loop. */
  stop() {
    clearInterval(this._intervalId);
    this._running = false;
    return this;
  }

  /** Returns true while the loop is running. */
  get running() { return this._running; }

  /**
   * Approve a pending decision (used when tier requires confirmation).
   * @param {string} decisionId
   */
  approve(decisionId) {
    const idx = this._pendingApprovals.findIndex(d => d.id === decisionId);
    if (idx === -1) throw new Error(`No pending decision: ${decisionId}`);
    const [decision] = this._pendingApprovals.splice(idx, 1);
    return this._executeAction(decision, 'user_confirmed');
  }

  /** Return all decisions waiting for user approval. */
  pendingApprovals() { return [...this._pendingApprovals]; }

  /* ── STEPS ──────────────────────────────────────────────────── */

  async _observe() {
    const signals = [];

    for (const [, integration] of this.actionHandlers) {
      if (typeof integration?.observe === 'function') {
        try {
          const s = await integration.observe();
          if (Array.isArray(s)) {
            s.forEach(sig => {
              this.worldModel.ingestSignal(sig);
              signals.push(sig);
            });
          }
        } catch (err) {
          this.emit('error', new Error(`observe failed: ${err.message}`));
        }
      }
    }

    this.emit('observe', signals);
    return signals;
  }

  async _decide() {
    this.worldModel.loadFromMemory(this.memory);
    const decisions = this.policyEngine.evaluate(this.worldModel);
    const sorted    = decisions.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.emit('decide', sorted);
    return sorted;
  }

  async _act(decisions) {
    const receipts = [];

    for (const decision of decisions) {
      const id = `pend-${Date.now().toString(36)}`;
      decision.id = id;

      if (canActWithoutApproval(this.tier) || this.tier.name === 'supervised') {
        const receipt = await this._executeAction(decision, 'auto');
        receipts.push(receipt);
      } else {
        this._pendingApprovals.push(decision);
        this.emit('approval_required', decision);
      }
    }

    return receipts;
  }

  async _verify(receipts) {
    for (const receipt of receipts) {
      try {
        const handler = this.actionHandlers.get(receipt.action);
        const outcome = handler?.verify
          ? await handler.verify(receipt)
          : 'completed — no verifier registered';

        this.auditLog.verify(receipt.id, outcome);
        receipt.outcome = outcome;
        receipt.status  = 'verified';
        this.emit('verify', receipt);
      } catch (err) {
        this.auditLog.fail(receipt.id, err.message);
        receipt.status = 'failed';
        this.emit('error', err);
      }
    }
  }

  async _learn(receipts) {
    const updates = [];

    for (const receipt of receipts) {
      if (receipt.status !== 'verified') continue;

      for (const policy of this.worldModel.activePolicies()) {
        if (policy.rule !== receipt.policy) continue;

        const feedback = this._detectFeedback(receipt);
        if (!feedback) continue;

        const updated = this.memory.updatePolicy(policy.id, { ...feedback });
        updates.push({ policy: updated, reason: feedback.learnReason });
        this.emit('learn', { policy: updated, reason: feedback.learnReason });
      }
    }

    return updates;
  }

  /* ── HELPERS ─────────────────────────────────────────────────── */

  async _executeAction(decision, approvalType) {
    const receipt = this.auditLog.write({
      intent:   decision.intent,
      context:  decision.context,
      policy:   decision.policy,
      action:   decision.action,
      approval: approvalType,
    });

    this.emit('act', receipt);

    const handler = this.actionHandlers.get(decision.action);
    if (handler?.execute) {
      try {
        await handler.execute(decision, receipt);
      } catch (err) {
        this.auditLog.fail(receipt.id, err.message);
        throw err;
      }
    }

    return receipt;
  }

  _detectFeedback(receipt) {
    if (receipt.outcome?.includes('confirmed')) {
      return { learnReason: 'user confirmed action — policy reinforced' };
    }
    if (receipt.outcome?.includes('rejected') || receipt.outcome?.includes('override')) {
      return { status: 'paused', learnReason: 'user rejected action — policy paused for review' };
    }
    return null;
  }
}

/**
 * @typedef {object} LoopResult
 * @property {object[]} signals
 * @property {object[]} decisions
 * @property {object[]} receipts
 * @property {object[]} updates
 */

export default GovernanceLoop;

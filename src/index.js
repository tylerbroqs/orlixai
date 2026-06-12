/**
 * Orlix — Personal AI Operating System
 *
 * Main entry point. Re-exports all public APIs.
 *
 * @example
 * import { Orlix } from 'orlixai';
 *
 * const orlix = new Orlix({ tier: 'supervised' });
 * orlix.memory.addGoal({ name: 'Ship MVP', deadline: '2026-07-15' });
 * orlix.memory.addPolicy({ rule: 'alert_if_goal_drift_gt_3d' });
 * orlix.loop.start(60_000);
 * orlix.loop.on('act', receipt => console.log(receipt));
 */

import { Memory }         from './core/Memory.js';
import { AuditLog }       from './core/AuditLog.js';
import { WorldModel }     from './core/WorldModel.js';
import { PolicyEngine }   from './core/PolicyEngine.js';
import { GovernanceLoop } from './core/GovernanceLoop.js';
import { parseTier, DEFAULT_TIER } from './core/AuthorityTier.js';

export { Memory }         from './core/Memory.js';
export { AuditLog }       from './core/AuditLog.js';
export { WorldModel }     from './core/WorldModel.js';
export { PolicyEngine }   from './core/PolicyEngine.js';
export { GovernanceLoop } from './core/GovernanceLoop.js';
export * as AuthorityTier from './core/AuthorityTier.js';
export * as Integrations  from './integrations/index.js';

/**
 * Convenience factory — creates and wires up all Orlix components.
 *
 * @param {object} [opts]
 * @param {string} [opts.tier='supervised'] — authority tier
 * @param {string} [opts.memoryPath]        — custom memory file path
 * @param {string} [opts.auditPath]         — custom audit log file path
 */
export class Orlix {
  constructor(opts = {}) {
    const tier = opts.tier ? parseTier(opts.tier) : DEFAULT_TIER;

    this.memory       = new Memory(opts.memoryPath).load();
    this.auditLog     = new AuditLog(opts.auditPath);
    this.worldModel   = new WorldModel();
    this.policyEngine = new PolicyEngine();

    this.loop = new GovernanceLoop({
      worldModel:   this.worldModel,
      policyEngine: this.policyEngine,
      memory:       this.memory,
      auditLog:     this.auditLog,
      tier,
    });
  }

  /**
   * Register an action handler / integration.
   * @param {string} actionId
   * @param {{ execute?: function, verify?: function, observe?: function }} handler
   */
  use(actionId, handler) {
    this.loop.actionHandlers.set(actionId, handler);
    return this;
  }

  /**
   * Run a single governance loop tick.
   * @returns {Promise<LoopResult>}
   */
  tick() { return this.loop.tick(); }

  /**
   * Start the recurring loop.
   * @param {number} [intervalMs=60000]
   */
  start(intervalMs) { this.loop.start(intervalMs); return this; }

  /** Stop the loop. */
  stop() { this.loop.stop(); return this; }
}

export default Orlix;

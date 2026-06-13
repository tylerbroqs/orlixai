/**
 * Orlix — Personal AI Operating System
 * @packageDocumentation
 */

export * from './types/index.js';
export * from './core/AuthorityTier.js';
export { Memory }         from './core/Memory.js';
export { AuditLog }       from './core/AuditLog.js';
export { WorldModel }     from './core/WorldModel.js';
export { PolicyEngine }   from './core/PolicyEngine.js';
export { GovernanceLoop } from './core/GovernanceLoop.js';
export * as Integrations  from './integrations/index.js';

import { Memory }         from './core/Memory.js';
import { AuditLog }       from './core/AuditLog.js';
import { WorldModel }     from './core/WorldModel.js';
import { PolicyEngine }   from './core/PolicyEngine.js';
import { GovernanceLoop } from './core/GovernanceLoop.js';
import { parseTier, DEFAULT_TIER } from './core/AuthorityTier.js';
import type { OrlixConfig, ActionHandler, LoopResult } from './types/index.js';

export class Orlix {
  readonly memory:       Memory;
  readonly auditLog:     AuditLog;
  readonly worldModel:   WorldModel;
  readonly policyEngine: PolicyEngine;
  readonly loop:         GovernanceLoop;

  constructor(opts: OrlixConfig = {}) {
    const tier         = opts.tier ? parseTier(opts.tier) : DEFAULT_TIER;
    this.memory        = new Memory(opts.memoryPath).load();
    this.auditLog      = new AuditLog(opts.auditPath);
    this.worldModel    = new WorldModel();
    this.policyEngine  = new PolicyEngine();
    this.loop          = new GovernanceLoop({
      worldModel: this.worldModel, policyEngine: this.policyEngine,
      memory: this.memory, auditLog: this.auditLog, tier,
    });
  }

  use(actionId: string, handler: ActionHandler): this {
    this.loop.actionHandlers.set(actionId, handler);
    return this;
  }

  tick(): Promise<LoopResult>    { return this.loop.tick(); }
  start(ms?: number): this       { this.loop.start(ms); return this; }
  stop(): this                   { this.loop.stop(); return this; }
}

export default Orlix;

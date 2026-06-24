import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AuditLog } from '../../src/core/AuditLog.js';
import { GovernanceLoop } from '../../src/core/GovernanceLoop.js';
import { Memory } from '../../src/core/Memory.js';
import { PolicyEngine } from '../../src/core/PolicyEngine.js';
import { TIERS } from '../../src/core/AuthorityTier.js';
import { WorldModel } from '../../src/core/WorldModel.js';

const tmpDir = path.join(os.tmpdir(), `orlix-test-loop-${Date.now()}`);
const memoryPath = path.join(tmpDir, 'memory.json');
const auditPath = path.join(tmpDir, 'audit.jsonl');

describe('GovernanceLoop', () => {
  afterEach(() => {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  });

  it('assigns unique ids to multiple pending approvals from the same tick', async () => {
    const memory = new Memory(memoryPath).load();
    memory.addPolicy({ rule: 'first_rule' });
    memory.addPolicy({ rule: 'second_rule' });

    const policyEngine = new PolicyEngine();
    policyEngine.register('first_rule', (_world, policy) => ({
      intent: 'first',
      context: 'ctx',
      action: 'noop',
      priority: 1,
      policy: policy.rule,
      policyVersion: policy.version,
    }));
    policyEngine.register('second_rule', (_world, policy) => ({
      intent: 'second',
      context: 'ctx',
      action: 'noop',
      priority: 1,
      policy: policy.rule,
      policyVersion: policy.version,
    }));

    const loop = new GovernanceLoop({
      worldModel: new WorldModel(),
      policyEngine,
      memory,
      auditLog: new AuditLog(auditPath),
      tier: TIERS.CONFIRM,
    });

    await loop.tick();

    const ids = loop.pendingApprovals().map((decision) => decision.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});

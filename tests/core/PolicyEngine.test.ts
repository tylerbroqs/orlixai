import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine }  from '../../src/core/PolicyEngine.js';
import { WorldModel }    from '../../src/core/WorldModel.js';
import { Memory }        from '../../src/core/Memory.js';
import path from 'path';
import os   from 'os';

const tmpMem = path.join(os.tmpdir(), `orlix-pe-mem-${Date.now()}.json`);

describe('PolicyEngine', () => {
  let engine: PolicyEngine;
  let world:  WorldModel;
  let mem:    Memory;

  beforeEach(() => {
    engine = new PolicyEngine();
    world  = new WorldModel();
    mem    = new Memory(tmpMem).load();
  });

  it('returns no decisions when world model is empty', () => {
    expect(engine.evaluate(world)).toHaveLength(0);
  });

  it('triggers alert_if_goal_overdue for overdue goals', () => {
    mem.addGoal({
      name:     'Overdue task',
      deadline: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
      progress: 0.5,
    });
    mem.addPolicy({ rule: 'alert_if_goal_overdue' });
    world.loadFromMemory(mem);

    const decisions = engine.evaluate(world);
    expect(decisions.some((d) => d.action === 'send_overdue_alert')).toBe(true);
  });

  it('triggers alert_if_goal_drift_gt_Nd for stale goals', () => {
    const staleDate = new Date(Date.now() - 5 * 86_400_000).toISOString();
    mem.addGoal({ name: 'Stale goal', progress: 0.2 });
    // manually set updatedAt in the past
    const goals = mem.getGoals();
    mem.updateGoal(goals[0]!.id, { updatedAt: staleDate } as never);
    mem.addPolicy({ rule: 'alert_if_goal_drift_gt_3d' });
    world.loadFromMemory(mem);

    const decisions = engine.evaluate(world);
    expect(decisions.some((d) => d.action === 'send_priority_alert')).toBe(true);
  });

  it('allows registering custom rules', () => {
    mem.addPolicy({ rule: 'my_custom_rule' });
    world.loadFromMemory(mem);

    engine.register('my_custom_rule', (_w, _p) => ({
      intent: 'Custom triggered', context: 'test',
      action: 'custom_action', priority: 5,
      policy: 'my_custom_rule', policyVersion: 1,
    }));

    const decisions = engine.evaluate(world);
    expect(decisions.some((d) => d.action === 'custom_action')).toBe(true);
  });
});

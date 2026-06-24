import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Memory } from '../../src/core/Memory.js';

const tmpPath = path.join(os.tmpdir(), `orlix-test-memory-${Date.now()}.json`);

describe('Memory', () => {
  let mem: Memory;

  beforeEach(() => {
    mem = new Memory(tmpPath).load();
  });
  afterEach(() => {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  });

  // ── goals ──────────────────────────────────────────────────────────────────

  describe('goals', () => {
    it('adds a goal and persists to disk', () => {
      const g = mem.addGoal({ name: 'Ship MVP', deadline: '2026-07-15', progress: 0 });
      expect(g.id).toBeTruthy();
      expect(g.name).toBe('Ship MVP');

      const reloaded = new Memory(tmpPath).load();
      expect(reloaded.getGoals()).toHaveLength(1);
      expect(reloaded.getGoals()[0].name).toBe('Ship MVP');
    });

    it('updates a goal', () => {
      const g = mem.addGoal({ name: 'Write docs' });
      mem.updateGoal(g.id, { progress: 0.5 });
      expect(mem.getGoals()[0].progress).toBe(0.5);
    });

    it('removes a goal', () => {
      const g = mem.addGoal({ name: 'Temp goal' });
      mem.removeGoal(g.id);
      expect(mem.getGoals()).toHaveLength(0);
    });

    it('throws when updating a non-existent goal', () => {
      expect(() => mem.updateGoal('bad-id', { progress: 1 })).toThrow('Goal not found');
    });
  });

  // ── facts ──────────────────────────────────────────────────────────────────

  describe('facts', () => {
    it('adds a fact with source tracking', () => {
      const f = mem.addFact({
        content: 'Alex owns design review',
        source: 'email',
        confidence: 0.95,
      });
      expect(f.source).toBe('email');
      expect(f.confidence).toBe(0.95);
    });

    it('removes a fact', () => {
      const f = mem.addFact({ content: 'Test fact' });
      mem.removeFact(f.id);
      expect(mem.getFacts()).toHaveLength(0);
    });
  });

  // ── policies ───────────────────────────────────────────────────────────────

  describe('policies', () => {
    it('adds a policy with version 1', () => {
      const p = mem.addPolicy({ rule: 'alert_if_goal_drift_gt_3d' });
      expect(p.version).toBe(1);
      expect(p.status).toBe('active');
    });

    it('increments version on update', () => {
      const p = mem.addPolicy({ rule: 'my_rule' });
      const updated = mem.updatePolicy(p.id, { status: 'paused' });
      expect(updated.version).toBe(2);
    });

    it('filters policies by status', () => {
      mem.addPolicy({ rule: 'active_rule', status: 'active' });
      const p = mem.addPolicy({ rule: 'paused_rule', status: 'active' });
      mem.updatePolicy(p.id, { status: 'paused' });

      expect(mem.getPolicies('active')).toHaveLength(1);
      expect(mem.getPolicies('paused')).toHaveLength(1);
      expect(mem.getPolicies()).toHaveLength(2);
    });
  });

  // ── export ─────────────────────────────────────────────────────────────────

  describe('export', () => {
    it('exports a valid MemoryExport object', () => {
      mem.addGoal({ name: 'Export test' });
      const exported = mem.export();
      expect(exported.schema).toBe('orlix/v1');
      expect(exported.exported_at).toBeTruthy();
      expect(exported.goals).toHaveLength(1);
    });
  });

  describe('load', () => {
    it('refuses to replace corrupt JSON with an empty store', () => {
      fs.writeFileSync(tmpPath, '{bad json', 'utf8');

      expect(() => new Memory(tmpPath).load()).toThrow('Memory file is not valid JSON');
      expect(fs.readFileSync(tmpPath, 'utf8')).toBe('{bad json');
    });
  });
});

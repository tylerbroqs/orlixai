import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs   from 'fs';
import path from 'path';
import os   from 'os';
import { AuditLog } from '../../src/core/AuditLog.js';

const tmpPath = path.join(os.tmpdir(), `orlix-test-audit-${Date.now()}.jsonl`);

describe('AuditLog', () => {
  let log: AuditLog;

  beforeEach(() => { log = new AuditLog(tmpPath); });
  afterEach(() => { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); });

  it('writes a receipt with id and timestamp', () => {
    const r = log.write({ intent: 'Test intent', context: 'ctx', action: 'test_action', approval: 'auto' });
    expect(r.id).toMatch(/^receipt-/);
    expect(r.status).toBe('pending');
    expect(r.rollback.available).toBe(true);
  });

  it('verifies a receipt', () => {
    const r = log.write({ intent: 'i', context: 'c', action: 'a', approval: 'auto' });
    log.verify(r.id, 'done');
    const updated = log.get(r.id);
    expect(updated?.status).toBe('verified');
    expect(updated?.outcome).toBe('done');
  });

  it('fails a receipt', () => {
    const r = log.write({ intent: 'i', context: 'c', action: 'a', approval: 'auto' });
    log.fail(r.id, 'something broke');
    expect(log.get(r.id)?.status).toBe('failed');
  });

  it('returns null for unknown id', () => {
    expect(log.get('nonexistent')).toBeNull();
  });

  it('returns empty list when file does not exist', () => {
    const fresh = new AuditLog('/tmp/does-not-exist-orlix.jsonl');
    expect(fresh.list()).toEqual([]);
  });

  it('lists receipts in reverse chronological order', () => {
    log.write({ intent: 'a', context: '', action: 'a', approval: 'auto' });
    log.write({ intent: 'b', context: '', action: 'b', approval: 'auto' });
    const list = log.list();
    expect(list[0]?.intent).toBe('b');
    expect(list[1]?.intent).toBe('a');
  });

  it('returns stats', () => {
    const r1 = log.write({ intent: 'i', context: '', action: 'a', approval: 'auto' });
    const r2 = log.write({ intent: 'j', context: '', action: 'b', approval: 'auto' });
    log.verify(r1.id, 'ok');
    log.fail(r2.id, 'err');
    const stats = log.stats();
    expect(stats.verified).toBe(1);
    expect(stats.failed).toBe(1);
  });
});

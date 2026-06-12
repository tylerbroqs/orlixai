import fs   from 'fs';
import path from 'path';
import os   from 'os';

const DEFAULT_PATH = path.join(os.homedir(), '.orlix', 'audit.jsonl');

/**
 * Append-only audit log.
 * Every governance action produces a signed receipt written here.
 *
 * Receipt schema:
 *   id        — unique receipt ID
 *   timestamp — ISO 8601
 *   intent    — what Orlix intended to do
 *   context   — snapshot of relevant world-model state
 *   policy    — which policy triggered the action
 *   action    — what was actually done
 *   approval  — how it was approved (auto / user / skipped)
 *   outcome   — verified result
 *   rollback  — { available: bool, expiresAt: string }
 *   status    — pending | verified | failed | rolled_back
 */
export class AuditLog {
  constructor(filePath = DEFAULT_PATH) {
    this.filePath = filePath;
  }

  /**
   * Write a new receipt to the log.
   * @param {object} receipt
   * @returns {object} receipt with generated id + timestamp
   */
  write(receipt) {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const entry = {
      id:        this._receiptId(),
      timestamp: new Date().toISOString(),
      status:    'pending',
      rollback:  { available: true, expiresAt: this._rollbackExpiry() },
      ...receipt,
    };

    fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n', 'utf8');
    return entry;
  }

  /**
   * Mark an existing receipt as verified.
   * @param {string} id
   * @param {string} outcome
   */
  verify(id, outcome) {
    this._updateReceipt(id, { status: 'verified', outcome });
  }

  /**
   * Mark an existing receipt as failed.
   * @param {string} id
   * @param {string} reason
   */
  fail(id, reason) {
    this._updateReceipt(id, { status: 'failed', outcome: reason });
  }

  /**
   * Roll back an action (marks receipt as rolled_back).
   * @param {string} id
   */
  rollback(id) {
    const receipt = this.get(id);
    if (!receipt) throw new Error(`Receipt not found: ${id}`);
    if (!receipt.rollback?.available) throw new Error(`Rollback not available for receipt: ${id}`);
    if (new Date(receipt.rollback.expiresAt) < new Date()) throw new Error(`Rollback expired for receipt: ${id}`);
    this._updateReceipt(id, { status: 'rolled_back' });
  }

  /**
   * Retrieve a single receipt by id.
   * @param {string} id
   * @returns {object|null}
   */
  get(id) {
    return this.list().find(r => r.id === id) ?? null;
  }

  /**
   * Return all receipts, newest first.
   * @param {number} limit
   * @returns {object[]}
   */
  list(limit = 100) {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs.readFileSync(this.filePath, 'utf8')
      .split('\n')
      .filter(Boolean);
    return lines
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean)
      .reverse()
      .slice(0, limit);
  }

  /* ---- internals ---- */

  _receiptId() {
    const ts = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
    return `receipt-${ts}-${Math.random().toString(36).slice(2, 6)}`;
  }

  _rollbackExpiry() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  }

  _updateReceipt(id, patch) {
    if (!fs.existsSync(this.filePath)) return;
    const lines = fs.readFileSync(this.filePath, 'utf8').split('\n').filter(Boolean);
    const updated = lines.map(line => {
      try {
        const r = JSON.parse(line);
        if (r.id === id) return JSON.stringify({ ...r, ...patch });
        return line;
      } catch { return line; }
    });
    fs.writeFileSync(this.filePath, updated.join('\n') + '\n', 'utf8');
  }
}

export default AuditLog;

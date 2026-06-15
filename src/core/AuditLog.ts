import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Receipt } from '../types/index.js';

const DEFAULT_PATH = path.join(os.homedir(), '.orlix', 'audit.jsonl');

export class AuditLog {
  readonly filePath: string;

  constructor(filePath = DEFAULT_PATH) {
    this.filePath = filePath;
  }

  write(input: Omit<Receipt, 'id' | 'timestamp' | 'status' | 'rollback'>): Receipt {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const receipt: Receipt = {
      id: this._receiptId(),
      timestamp: new Date().toISOString(),
      status: 'pending',
      rollback: { available: true, expiresAt: this._rollbackExpiry() },
      ...input,
    };

    fs.appendFileSync(this.filePath, JSON.stringify(receipt) + '\n', 'utf8');
    return receipt;
  }

  verify(id: string, outcome: string): void {
    this._update(id, { status: 'verified', outcome });
  }

  fail(id: string, reason: string): void {
    this._update(id, { status: 'failed', outcome: reason });
  }

  rollback(id: string): void {
    const receipt = this.get(id);
    if (!receipt) throw new Error(`Receipt not found: ${id}`);
    if (!receipt.rollback.available) throw new Error(`Rollback unavailable: ${id}`);
    if (new Date(receipt.rollback.expiresAt) < new Date()) {
      throw new Error(`Rollback expired for: ${id}`);
    }
    this._update(id, {
      status: 'rolled_back',
      rollback: { available: false, expiresAt: receipt.rollback.expiresAt },
    });
  }

  get(id: string): Receipt | null {
    return this.list().find((r) => r.id === id) ?? null;
  }

  list(limit = 100): Receipt[] {
    if (!fs.existsSync(this.filePath)) return [];
    return fs
      .readFileSync(this.filePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as Receipt;
        } catch {
          return null;
        }
      })
      .filter((r): r is Receipt => r !== null)
      .reverse()
      .slice(0, limit);
  }

  stats(): { total: number; verified: number; failed: number; pending: number } {
    const all = this.list(10_000);
    return {
      total: all.length,
      verified: all.filter((r) => r.status === 'verified').length,
      failed: all.filter((r) => r.status === 'failed').length,
      pending: all.filter((r) => r.status === 'pending').length,
    };
  }

  private _update(id: string, patch: Partial<Receipt>): void {
    if (!fs.existsSync(this.filePath)) return;
    const lines = fs.readFileSync(this.filePath, 'utf8').split('\n').filter(Boolean);
    const updated = lines.map((line) => {
      try {
        const r = JSON.parse(line) as Receipt;
        return r.id === id ? JSON.stringify({ ...r, ...patch }) : line;
      } catch {
        return line;
      }
    });
    fs.writeFileSync(this.filePath, updated.join('\n') + '\n', 'utf8');
  }

  private _receiptId(): string {
    return `receipt-${new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
  }

  private _rollbackExpiry(): string {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  }
}

export default AuditLog;

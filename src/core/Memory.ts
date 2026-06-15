import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Goal, Fact, Policy, MemoryStore, MemoryExport } from '../types/index.js';

const DEFAULT_PATH = path.join(os.homedir(), '.orlix', 'memory.json');
const SCHEMA_VERSION = 'orlix/v1';

export class Memory {
  readonly filePath: string;
  private _data: MemoryStore | null = null;

  constructor(filePath = DEFAULT_PATH) {
    this.filePath = filePath;
  }

  // ── load / save ────────────────────────────────────────────────────────────

  load(): this {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(this.filePath)) {
      try {
        this._data = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as MemoryStore;
      } catch {
        this._data = this._empty();
      }
    } else {
      this._data = this._empty();
    }
    return this;
  }

  save(): this {
    this._ensure();
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this._data, null, 2), 'utf8');
    return this;
  }

  // ── goals ──────────────────────────────────────────────────────────────────

  addGoal(input: Pick<Goal, 'name'> & Partial<Pick<Goal, 'deadline' | 'progress'>>): Goal {
    this._ensure();
    const goal: Goal = {
      id: this._id(),
      name: input.name,
      deadline: input.deadline ?? null,
      progress: input.progress ?? 0,
      createdAt: now(),
      updatedAt: now(),
    };
    this._data!.goals.push(goal);
    this.save();
    return goal;
  }

  updateGoal(id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>): Goal {
    this._ensure();
    const g = this._data!.goals.find((x) => x.id === id);
    if (!g) throw new Error(`Goal not found: ${id}`);
    Object.assign(g, { updatedAt: now() }, patch);
    this.save();
    return g;
  }

  getGoals(): Goal[] {
    this._ensure();
    return [...this._data!.goals];
  }

  removeGoal(id: string): void {
    this._ensure();
    this._data!.goals = this._data!.goals.filter((x) => x.id !== id);
    this.save();
  }

  // ── facts ──────────────────────────────────────────────────────────────────

  addFact(input: Pick<Fact, 'content'> & Partial<Pick<Fact, 'source' | 'confidence'>>): Fact {
    this._ensure();
    const fact: Fact = {
      id: this._id(),
      content: input.content,
      source: input.source ?? 'manual',
      confidence: input.confidence ?? 1.0,
      createdAt: now(),
    };
    this._data!.facts.push(fact);
    this.save();
    return fact;
  }

  getFacts(): Fact[] {
    this._ensure();
    return [...this._data!.facts];
  }

  removeFact(id: string): void {
    this._ensure();
    this._data!.facts = this._data!.facts.filter((x) => x.id !== id);
    this.save();
  }

  // ── policies ───────────────────────────────────────────────────────────────

  addPolicy(input: Pick<Policy, 'rule'> & Partial<Pick<Policy, 'status' | 'priority'>>): Policy {
    this._ensure();
    const existing = this._data!.policies.filter((p) => p.rule === input.rule);
    const policy: Policy = {
      id: this._id(),
      rule: input.rule,
      version: existing.length + 1,
      status: input.status ?? 'active',
      priority: input.priority ?? 5,
      createdAt: now(),
      updatedAt: now(),
    };
    this._data!.policies.push(policy);
    this.save();
    return policy;
  }

  updatePolicy(id: string, patch: Partial<Omit<Policy, 'id' | 'createdAt'>>): Policy {
    this._ensure();
    const p = this._data!.policies.find((x) => x.id === id);
    if (!p) throw new Error(`Policy not found: ${id}`);
    if (patch.rule !== undefined || patch.status !== undefined) p.version += 1;
    Object.assign(p, patch, { updatedAt: now() });
    this.save();
    return p;
  }

  getPolicies(status?: Policy['status'] | null): Policy[] {
    this._ensure();
    const all = [...this._data!.policies];
    return status ? all.filter((p) => p.status === status) : all;
  }

  // ── export ─────────────────────────────────────────────────────────────────

  export(): MemoryExport {
    this._ensure();
    return {
      schema: SCHEMA_VERSION,
      exported_at: now(),
      goals: this.getGoals(),
      facts: this.getFacts(),
      policies: this.getPolicies(),
    };
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private _ensure(): void {
    if (!this._data) this.load();
  }

  private _empty(): MemoryStore {
    return { schema: SCHEMA_VERSION, goals: [], facts: [], policies: [] };
  }

  private _id(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }
}

function now(): string {
  return new Date().toISOString();
}

export default Memory;

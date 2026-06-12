import fs   from 'fs';
import path from 'path';
import os   from 'os';

const DEFAULT_PATH = path.join(os.homedir(), '.orlix', 'memory.json');
const SCHEMA_VERSION = 'orlix/v1';

/**
 * Persistent, versioned, local-first memory store.
 *
 * Stores three collections:
 *  - goals    { id, name, deadline, progress, createdAt, updatedAt }
 *  - facts    { id, content, source, confidence, createdAt }
 *  - policies { id, rule, version, status, createdAt, updatedAt }
 */
export class Memory {
  constructor(filePath = DEFAULT_PATH) {
    this.filePath = filePath;
    this._data = null;
  }

  /* ---- load / save ---- */

  load() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this._data = JSON.parse(raw);
      } catch {
        this._data = this._empty();
      }
    } else {
      this._data = this._empty();
    }
    return this;
  }

  save() {
    this._ensure();
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this._data, null, 2), 'utf8');
    return this;
  }

  /* ---- goals ---- */

  addGoal({ name, deadline = null, progress = 0 }) {
    this._ensure();
    const goal = { id: this._id(), name, deadline, progress, createdAt: now(), updatedAt: now() };
    this._data.goals.push(goal);
    this.save();
    return goal;
  }

  updateGoal(id, patch) {
    this._ensure();
    const g = this._data.goals.find(x => x.id === id);
    if (!g) throw new Error(`Goal not found: ${id}`);
    Object.assign(g, patch, { updatedAt: now() });
    this.save();
    return g;
  }

  getGoals() { this._ensure(); return [...this._data.goals]; }

  removeGoal(id) {
    this._ensure();
    this._data.goals = this._data.goals.filter(x => x.id !== id);
    this.save();
  }

  /* ---- facts ---- */

  addFact({ content, source = 'manual', confidence = 1.0 }) {
    this._ensure();
    const fact = { id: this._id(), content, source, confidence, createdAt: now() };
    this._data.facts.push(fact);
    this.save();
    return fact;
  }

  getFacts() { this._ensure(); return [...this._data.facts]; }

  removeFact(id) {
    this._ensure();
    this._data.facts = this._data.facts.filter(x => x.id !== id);
    this.save();
  }

  /* ---- policies ---- */

  addPolicy({ rule, status = 'active' }) {
    this._ensure();
    const version = (this._data.policies.filter(p => p.rule === rule).length) + 1;
    const policy = { id: this._id(), rule, version, status, createdAt: now(), updatedAt: now() };
    this._data.policies.push(policy);
    this.save();
    return policy;
  }

  updatePolicy(id, patch) {
    this._ensure();
    const p = this._data.policies.find(x => x.id === id);
    if (!p) throw new Error(`Policy not found: ${id}`);
    if (patch.rule !== undefined || patch.status !== undefined) p.version += 1;
    Object.assign(p, patch, { updatedAt: now() });
    this.save();
    return p;
  }

  getPolicies(status = null) {
    this._ensure();
    const all = [...this._data.policies];
    return status ? all.filter(p => p.status === status) : all;
  }

  /* ---- export ---- */

  export() {
    this._ensure();
    return {
      schema:      SCHEMA_VERSION,
      exported_at: now(),
      goals:       this.getGoals(),
      facts:       this.getFacts(),
      policies:    this.getPolicies(),
    };
  }

  /* ---- internals ---- */

  _ensure() {
    if (!this._data) this.load();
  }

  _empty() {
    return { schema: SCHEMA_VERSION, goals: [], facts: [], policies: [] };
  }

  _id() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }
}

function now() { return new Date().toISOString(); }

export default Memory;

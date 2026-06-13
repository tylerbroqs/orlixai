import { EventEmitter }   from 'events';
import type { Goal, Fact, Policy, Signal, WorldSnapshot } from '../types/index.js';
import type { Memory } from './Memory.js';

export class WorldModel extends EventEmitter {
  goals:    Goal[]   = [];
  facts:    Fact[]   = [];
  signals:  Signal[] = [];
  policies: Policy[] = [];

  loadFromMemory(memory: Memory): this {
    this.goals    = memory.getGoals();
    this.facts    = memory.getFacts();
    this.policies = memory.getPolicies('active');
    return this;
  }

  ingestSignal(input: Omit<Signal, 'id'>): Signal {
    const signal: Signal = {
      id: `sig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      ...input,
    };
    this.signals.unshift(signal);
    if (this.signals.length > 500) this.signals.length = 500;
    this.emit('signal', signal);
    return signal;
  }

  // ── queries ────────────────────────────────────────────────────────────────

  staleGoals(staleAfterDays = 3): Goal[] {
    const cutoff = Date.now() - staleAfterDays * 86_400_000;
    return this.goals.filter((g) => {
      if ((g.progress ?? 0) >= 1) return false;
      return new Date(g.updatedAt ?? g.createdAt).getTime() < cutoff;
    });
  }

  overdueGoals(): Goal[] {
    const now = new Date();
    return this.goals.filter(
      (g) => g.deadline && new Date(g.deadline) < now && (g.progress ?? 0) < 1,
    );
  }

  recentSignals(type: string | null = null, limit = 20): Signal[] {
    const all = type ? this.signals.filter((s) => s.type === type) : this.signals;
    return all.slice(0, limit);
  }

  activePolicies(): Policy[] {
    return [...this.policies].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  snapshot(): WorldSnapshot {
    return {
      timestamp: new Date().toISOString(),
      goals:     this.goals,
      facts:     this.facts,
      signals:   this.signals.slice(0, 50),
      policies:  this.policies,
    };
  }
}

export default WorldModel;

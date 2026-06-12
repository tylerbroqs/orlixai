/**
 * WorldModel — a living snapshot of the user's current context.
 *
 * Holds:
 *   goals    — active goals with progress and deadlines
 *   facts    — sourced beliefs about the world
 *   signals  — real-time events from integrations (calendar, email, etc.)
 *   policies — active governance rules
 */
export class WorldModel {
  constructor() {
    this.goals    = [];
    this.facts    = [];
    this.signals  = [];
    this.policies = [];
    this._listeners = [];
  }

  /* ---- population ---- */

  /**
   * Load from a Memory instance.
   * @param {import('./Memory.js').Memory} memory
   */
  loadFromMemory(memory) {
    this.goals    = memory.getGoals();
    this.facts    = memory.getFacts();
    this.policies = memory.getPolicies('active');
    return this;
  }

  /**
   * Inject a real-time signal (e.g. from a calendar or email integration).
   * @param {{ type: string, source: string, payload: object }} signal
   */
  ingestSignal(signal) {
    const entry = {
      id:        `sig-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      ...signal,
    };
    this.signals.unshift(entry);
    if (this.signals.length > 500) this.signals.length = 500;
    this._emit('signal', entry);
    return entry;
  }

  /* ---- queries ---- */

  /**
   * Return goals whose progress is below threshold and haven't been touched
   * in more than `staleAfterDays` days.
   * @param {number} staleAfterDays
   * @returns {object[]}
   */
  staleGoals(staleAfterDays = 3) {
    const cutoff = Date.now() - staleAfterDays * 86_400_000;
    return this.goals.filter(g => {
      if (g.progress >= 1) return false;
      const last = new Date(g.updatedAt ?? g.createdAt).getTime();
      return last < cutoff;
    });
  }

  /**
   * Return goals that are past their deadline.
   * @returns {object[]}
   */
  overdueGoals() {
    const now = new Date();
    return this.goals.filter(g => g.deadline && new Date(g.deadline) < now && g.progress < 1);
  }

  /**
   * Return the most recent signals of a given type.
   * @param {string} type
   * @param {number} limit
   * @returns {object[]}
   */
  recentSignals(type = null, limit = 20) {
    const all = type ? this.signals.filter(s => s.type === type) : this.signals;
    return all.slice(0, limit);
  }

  /**
   * Return active policies sorted by priority (highest first).
   * @returns {object[]}
   */
  activePolicies() {
    return [...this.policies].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /* ---- serialisation ---- */

  snapshot() {
    return {
      timestamp:   new Date().toISOString(),
      goals:       this.goals,
      facts:       this.facts,
      signals:     this.signals.slice(0, 50),
      policies:    this.policies,
    };
  }

  /* ---- events ---- */

  on(event, fn) { this._listeners.push({ event, fn }); }

  _emit(event, data) {
    this._listeners
      .filter(l => l.event === event)
      .forEach(l => l.fn(data));
  }
}

export default WorldModel;

/**
 * PolicyEngine — evaluates active policies against the current world model
 * and produces a list of triggered decisions.
 *
 * A policy rule is a string identifier that maps to a built-in evaluator.
 * Custom rules can be registered at runtime.
 *
 * Built-in rules:
 *   notify_if_blocker_gt_Nd      — alert if goal has blockers untouched > N days
 *   alert_if_goal_drift_gt_Nd    — alert if goal progress stale > N days
 *   require_confirm_before_send  — require user approval before outbound messages
 *   summarise_email_on_wake      — summarise inbox on first run of the day
 *   rollback_available_Nd        — ensure rollback window is N days
 */

export class PolicyEngine {
  constructor() {
    this._rules = new Map();
    this._registerBuiltins();
  }

  /**
   * Register a custom rule evaluator.
   * @param {string} ruleId
   * @param {function(worldModel: WorldModel): Decision|null} evaluator
   */
  register(ruleId, evaluator) {
    this._rules.set(ruleId, evaluator);
    return this;
  }

  /**
   * Evaluate all active policies in the world model.
   * @param {import('./WorldModel.js').WorldModel} worldModel
   * @returns {Decision[]}
   */
  evaluate(worldModel) {
    const decisions = [];

    for (const policy of worldModel.activePolicies()) {
      const evaluator = this._matchEvaluator(policy.rule);
      if (!evaluator) continue;

      try {
        const decision = evaluator(worldModel, policy);
        if (decision) {
          decisions.push({ ...decision, policy: policy.rule, policyVersion: policy.version });
        }
      } catch (err) {
        console.error(`[PolicyEngine] Rule "${policy.rule}" threw: ${err.message}`);
      }
    }

    return decisions;
  }

  /* ---- internals ---- */

  _matchEvaluator(rule) {
    if (this._rules.has(rule)) return this._rules.get(rule);
    for (const [key, fn] of this._rules) {
      if (rule.startsWith(key.replace(/_\d+d$/, '_'))) return fn;
    }
    return null;
  }

  _registerBuiltins() {
    /* alert if goal drift > N days */
    this._rules.set('alert_if_goal_drift_gt_Nd', (world, policy) => {
      const days = this._extractDays(policy.rule) ?? 3;
      const stale = world.staleGoals(days);
      if (!stale.length) return null;
      return {
        intent:   `Goal drift detected — ${stale.length} goal(s) untouched > ${days} days`,
        context:  stale.map(g => g.name).join(', '),
        action:   'send_priority_alert',
        priority: 8,
      };
    });

    /* alert if goal is overdue */
    this._rules.set('alert_if_goal_overdue', (world) => {
      const overdue = world.overdueGoals();
      if (!overdue.length) return null;
      return {
        intent:   `${overdue.length} goal(s) past deadline`,
        context:  overdue.map(g => `${g.name} (due ${g.deadline})`).join(', '),
        action:   'send_overdue_alert',
        priority: 9,
      };
    });

    /* require confirmation before any send action */
    this._rules.set('require_confirm_before_send', () => ({
      intent:   'Outbound action gated by confirmation policy',
      context:  'Policy: require_confirm_before_send is active',
      action:   'gate_send_actions',
      priority: 10,
    }));

    /* summarise email on first daily run */
    this._rules.set('summarise_email_on_wake', (world) => {
      const signals = world.recentSignals('email_received', 1);
      if (!signals.length) return null;
      return {
        intent:   'Summarise unread emails',
        context:  `${signals.length} email signal(s) waiting`,
        action:   'summarise_inbox',
        priority: 5,
      };
    });

    /* notify if calendar block upcoming */
    this._rules.set('notify_before_calendar_event', (world) => {
      const soon = world.recentSignals('calendar_event', 5)
        .filter(s => {
          const start = s.payload?.startTime ? new Date(s.payload.startTime) : null;
          if (!start) return false;
          const diff = start - Date.now();
          return diff > 0 && diff < 15 * 60 * 1000;
        });
      if (!soon.length) return null;
      return {
        intent:   `Calendar event starting in < 15 minutes`,
        context:  soon.map(s => s.payload?.title ?? 'Untitled').join(', '),
        action:   'send_calendar_reminder',
        priority: 7,
      };
    });
  }

  _extractDays(rule) {
    const m = rule.match(/_(\d+)d$/);
    return m ? parseInt(m[1], 10) : null;
  }
}

/**
 * @typedef {object} Decision
 * @property {string} intent
 * @property {string} context
 * @property {string} action
 * @property {number} priority
 * @property {string} policy
 * @property {number} policyVersion
 */

export default PolicyEngine;

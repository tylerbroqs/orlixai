import type { Decision, Evaluator, Policy } from '../types/index.js';
import type { WorldModel } from './WorldModel.js';

export class PolicyEngine {
  private _rules = new Map<string, Evaluator>();

  constructor() {
    this._registerBuiltins();
  }

  register(ruleId: string, evaluator: Evaluator): this {
    this._rules.set(ruleId, evaluator);
    return this;
  }

  evaluate(worldModel: WorldModel): Decision[] {
    const decisions: Decision[] = [];

    for (const policy of worldModel.activePolicies()) {
      const evaluator = this._matchEvaluator(policy.rule);
      if (!evaluator) continue;

      try {
        const decision = evaluator(worldModel, policy);
        if (decision) {
          decisions.push({
            ...decision,
            policy:        policy.rule,
            policyVersion: policy.version,
          });
        }
      } catch (err) {
        console.error(`[PolicyEngine] Rule "${policy.rule}" threw: ${(err as Error).message}`);
      }
    }

    return decisions;
  }

  private _matchEvaluator(rule: string): Evaluator | undefined {
    if (this._rules.has(rule)) return this._rules.get(rule);
    for (const [key, fn] of this._rules) {
      const pattern = key.replace(/_\d+d$/, '_');
      if (rule.startsWith(pattern) && pattern !== key) return fn;
    }
    return undefined;
  }

  private _registerBuiltins(): void {
    this._rules.set('alert_if_goal_drift_gt_Nd', (world, policy): Decision | null => {
      const days  = this._days(policy.rule) ?? 3;
      const stale = world.staleGoals(days);
      if (!stale.length) return null;
      return {
        intent:   `Goal drift — ${stale.length} goal(s) untouched > ${days} days`,
        context:  stale.map((g) => g.name).join(', '),
        action:   'send_priority_alert',
        priority: 8,
        policy:   policy.rule,
        policyVersion: policy.version,
      };
    });

    this._rules.set('alert_if_goal_overdue', (world, policy): Decision | null => {
      const overdue = world.overdueGoals();
      if (!overdue.length) return null;
      return {
        intent:   `${overdue.length} goal(s) past deadline`,
        context:  overdue.map((g) => `${g.name} (due ${g.deadline})`).join(', '),
        action:   'send_overdue_alert',
        priority: 9,
        policy:   policy.rule,
        policyVersion: policy.version,
      };
    });

    this._rules.set('require_confirm_before_send', (_w, policy): Decision => ({
      intent:   'Outbound action gated by confirmation policy',
      context:  'Policy: require_confirm_before_send is active',
      action:   'gate_send_actions',
      priority: 10,
      policy:   policy.rule,
      policyVersion: policy.version,
    }));

    this._rules.set('summarise_email_on_wake', (world, policy): Decision | null => {
      const signals = world.recentSignals('email_received', 1);
      if (!signals.length) return null;
      return {
        intent:   'Summarise unread emails',
        context:  `${signals.length} email signal(s) waiting`,
        action:   'summarise_inbox',
        priority: 5,
        policy:   policy.rule,
        policyVersion: policy.version,
      };
    });

    this._rules.set('notify_before_calendar_event', (world, policy): Decision | null => {
      const soon = world.recentSignals('calendar_event', 5).filter((s) => {
        const start = s.payload?.startTime ? new Date(s.payload.startTime as string) : null;
        if (!start) return false;
        const diff = start.getTime() - Date.now();
        return diff > 0 && diff < 15 * 60 * 1000;
      });
      if (!soon.length) return null;
      return {
        intent:   'Calendar event starting in < 15 minutes',
        context:  soon.map((s) => (s.payload?.title as string) ?? 'Untitled').join(', '),
        action:   'send_calendar_reminder',
        priority: 7,
        policy:   policy.rule,
        policyVersion: policy.version,
      };
    });
  }

  private _days(rule: string): number | null {
    const m = rule.match(/_(\d+)d$/);
    return m ? parseInt(m[1], 10) : null;
  }
}

export default PolicyEngine;

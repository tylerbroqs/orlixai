import type { Tier, TierName } from '../types/index.js';

export const TIERS: Record<string, Tier> = {
  OBSERVE: { name: 'observe', level: 1 },
  SUGGEST: { name: 'suggest', level: 2 },
  CONFIRM: { name: 'confirm', level: 3 },
  SUPERVISED: { name: 'supervised', level: 4 },
  AUTONOMOUS: { name: 'autonomous', level: 5 },
} as const;

export const DEFAULT_TIER: Tier = TIERS.SUPERVISED;

export function parseTier(name: string): Tier {
  const key = name.toUpperCase();
  const tier = TIERS[key];
  if (!tier) {
    throw new Error(`Unknown authority tier: "${name}". Valid: ${Object.keys(TIERS).join(', ')}`);
  }
  return tier;
}

export function canActWithoutApproval(tier: Tier): boolean {
  return tier.level >= TIERS.SUPERVISED.level;
}

export function requiresConfirmation(tier: Tier): boolean {
  return tier.level <= TIERS.CONFIRM.level;
}

export function tierLabel(tier: Tier): string {
  const labels: Record<TierName, string> = {
    observe: 'Observe only — Orlix watches, nothing else',
    suggest: 'Suggest — recommendations only, you decide',
    confirm: 'Confirm — Orlix asks before every action',
    supervised: 'Supervised — acts, notifies, can roll back (default)',
    autonomous: 'Autonomous — acts independently within policy bounds',
  };
  return labels[tier.name] ?? tier.name;
}

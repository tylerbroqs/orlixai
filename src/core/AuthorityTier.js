/**
 * Authority tiers — controls how much Orlix is allowed to do.
 * Ordered from least to most autonomous.
 */

export const TIERS = {
  OBSERVE:     { name: 'observe',     level: 1 },
  SUGGEST:     { name: 'suggest',     level: 2 },
  CONFIRM:     { name: 'confirm',     level: 3 },
  SUPERVISED:  { name: 'supervised',  level: 4 },
  AUTONOMOUS:  { name: 'autonomous',  level: 5 },
};

export const DEFAULT_TIER = TIERS.SUPERVISED;

/**
 * Parse a tier name string into a TIERS object.
 * @param {string} name
 * @returns {{ name: string, level: number }}
 */
export function parseTier(name) {
  const key = name.toUpperCase();
  if (!TIERS[key]) throw new Error(`Unknown authority tier: "${name}". Valid: ${Object.keys(TIERS).join(', ')}`);
  return TIERS[key];
}

/**
 * Returns true if the given tier allows taking actions without asking first.
 * @param {{ name: string, level: number }} tier
 * @returns {boolean}
 */
export function canActWithoutApproval(tier) {
  return tier.level >= TIERS.SUPERVISED.level;
}

/**
 * Returns true if the given tier requires explicit user confirmation.
 * @param {{ name: string, level: number }} tier
 * @returns {boolean}
 */
export function requiresConfirmation(tier) {
  return tier.level <= TIERS.CONFIRM.level;
}

export default { TIERS, DEFAULT_TIER, parseTier, canActWithoutApproval, requiresConfirmation };

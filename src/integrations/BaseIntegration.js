/**
 * BaseIntegration — base class for all Orlix connectors.
 *
 * Subclass this to build your own integration:
 *
 *   import { BaseIntegration } from 'orlixai/integrations';
 *
 *   export class MyIntegration extends BaseIntegration {
 *     async observe() { return [{ type: 'my_event', source: 'my_app', payload: {} }]; }
 *     async execute(decision, receipt) { ... }
 *     async verify(receipt) { return 'completed'; }
 *   }
 */
export class BaseIntegration {
  /**
   * @param {string} name — human-readable integration name
   * @param {object} [config] — integration-specific configuration
   */
  constructor(name, config = {}) {
    this.name   = name;
    this.config = config;
    this._connected = false;
  }

  /**
   * Connect to the external service.
   * Override to perform auth / token exchange.
   * @returns {Promise<void>}
   */
  async connect() {
    this._connected = true;
  }

  /**
   * Disconnect / clean up.
   * @returns {Promise<void>}
   */
  async disconnect() {
    this._connected = false;
  }

  get connected() { return this._connected; }

  /**
   * OBSERVE — pull signals from the external service.
   * Called on every governance loop tick.
   * @returns {Promise<Signal[]>}
   */
  async observe() { return []; }

  /**
   * ACT — execute a decision via this integration.
   * @param {object} decision
   * @param {object} receipt
   * @returns {Promise<void>}
   */
  async execute(decision, receipt) { void decision; void receipt; }

  /**
   * VERIFY — confirm the action achieved its intent.
   * @param {object} receipt
   * @returns {Promise<string>} — human-readable outcome description
   */
  async verify(receipt) { void receipt; return 'completed'; }

  /** Helper: build a standard signal object. */
  _signal(type, payload = {}) {
    return { type, source: this.name, payload, timestamp: new Date().toISOString() };
  }
}

/**
 * @typedef {object} Signal
 * @property {string} type
 * @property {string} source
 * @property {object} payload
 * @property {string} timestamp
 */

export default BaseIntegration;

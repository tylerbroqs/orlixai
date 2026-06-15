import type { Signal, Decision, Receipt, ActionHandler } from '../types/index.js';

export abstract class BaseIntegration implements ActionHandler {
  readonly name: string;
  protected config: Record<string, unknown>;
  private _connected = false;

  constructor(name: string, config: Record<string, unknown> = {}) {
    this.name = name;
    this.config = config;
  }

  connect(): Promise<void> {
    this._connected = true;
    return Promise.resolve();
  }
  disconnect(): Promise<void> {
    this._connected = false;
    return Promise.resolve();
  }
  get connected(): boolean {
    return this._connected;
  }

  observe(): Promise<Omit<Signal, 'id'>[]> {
    return Promise.resolve([]);
  }
  execute(_d: Decision, _r: Receipt): Promise<void> {
    return Promise.resolve();
  }
  verify(_r: Receipt): Promise<string> {
    return Promise.resolve('completed');
  }

  protected signal(type: string, payload: Record<string, unknown> = {}): Omit<Signal, 'id'> {
    return { type, source: this.name, payload, timestamp: new Date().toISOString() };
  }
}

export default BaseIntegration;

import type { Signal, Decision, Receipt, ActionHandler } from '../types/index.js';

export abstract class BaseIntegration implements ActionHandler {
  readonly name: string;
  protected config: Record<string, unknown>;
  private _connected = false;

  constructor(name: string, config: Record<string, unknown> = {}) {
    this.name   = name;
    this.config = config;
  }

  async connect(): Promise<void>    { this._connected = true; }
  async disconnect(): Promise<void> { this._connected = false; }
  get connected(): boolean          { return this._connected; }

  async observe(): Promise<Omit<Signal, 'id'>[]>                  { return []; }
  async execute(_d: Decision, _r: Receipt): Promise<void>         { return; }
  async verify(_r: Receipt): Promise<string>                      { return 'completed'; }

  protected signal(type: string, payload: Record<string, unknown> = {}): Omit<Signal, 'id'> {
    return { type, source: this.name, payload, timestamp: new Date().toISOString() };
  }
}

export default BaseIntegration;

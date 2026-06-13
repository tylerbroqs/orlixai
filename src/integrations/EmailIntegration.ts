import { BaseIntegration }  from './BaseIntegration.js';
import type { EmailMessage, Decision, Receipt, Signal } from '../types/index.js';

interface EmailConfig {
  inbox?: EmailMessage[];
  replyThresholdHours?: number;
}

export class EmailIntegration extends BaseIntegration {
  private _inbox:     EmailMessage[];
  private _threshold: number;

  constructor(config: EmailConfig = {}) {
    super('gmail', config as Record<string, unknown>);
    this._inbox     = config.inbox ?? [];
    this._threshold = config.replyThresholdHours ?? 24;
  }

  async observe(): Promise<Omit<Signal, 'id'>[]> {
    const messages = this._inbox.filter((m) => !m.read);
    const signals: Omit<Signal, 'id'>[] = [];

    for (const msg of messages) {
      signals.push(this.signal('email_received', {
        from:       msg.from,
        subject:    msg.subject,
        preview:    msg.preview ?? '',
        receivedAt: msg.receivedAt,
      }));

      const hoursOld = (Date.now() - new Date(msg.receivedAt).getTime()) / 3_600_000;
      if (hoursOld > this._threshold) {
        signals.push(this.signal('email_overdue', {
          from:     msg.from,
          subject:  msg.subject,
          hoursOld: Math.round(hoursOld),
        }));
      }
    }
    return signals;
  }

  async execute(decision: Decision, _receipt: Receipt): Promise<void> {
    if (decision.action === 'summarise_inbox') {
      console.log(`[EmailIntegration] Summarising ${this._inbox.length} message(s)…`);
    } else if (decision.action === 'send_email') {
      console.log(`[EmailIntegration] Sending: ${JSON.stringify(decision.payload ?? {})}`);
    }
  }

  async verify(receipt: Receipt): Promise<string> {
    if (receipt.action === 'summarise_inbox') return 'inbox summary delivered';
    if (receipt.action === 'send_email')      return 'email sent and logged';
    return 'completed';
  }
}

export default EmailIntegration;

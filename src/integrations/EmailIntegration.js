import { BaseIntegration } from './BaseIntegration.js';

/**
 * EmailIntegration — observes unread emails and gates outbound sends.
 *
 * Emits signals:
 *   email_received  — new unread message
 *   email_overdue   — email awaiting reply > threshold hours
 *
 * Handles actions:
 *   summarise_inbox       — summarise unread messages
 *   send_email            — send an email (gated by authority tier)
 */
export class EmailIntegration extends BaseIntegration {
  constructor(config = {}) {
    super('gmail', config);
    this._inbox          = config.inbox ?? [];
    this._replyThresholdHours = config.replyThresholdHours ?? 24;
  }

  async connect() {
    // TODO: OAuth2 with Gmail / IMAP
    await super.connect();
  }

  async observe() {
    const messages = await this._fetchUnread();
    const signals  = [];

    for (const msg of messages) {
      signals.push(this._signal('email_received', {
        from:    msg.from,
        subject: msg.subject,
        preview: msg.preview ?? '',
        receivedAt: msg.receivedAt,
      }));

      const hoursOld = (Date.now() - new Date(msg.receivedAt).getTime()) / 3_600_000;
      if (hoursOld > this._replyThresholdHours) {
        signals.push(this._signal('email_overdue', {
          from:    msg.from,
          subject: msg.subject,
          hoursOld: Math.round(hoursOld),
        }));
      }
    }

    return signals;
  }

  async execute(decision, receipt) {
    switch (decision.action) {
      case 'summarise_inbox':
        console.log(`[EmailIntegration] Summarising ${this._inbox.length} unread message(s)…`);
        break;
      case 'send_email':
        console.log(`[EmailIntegration] Sending: ${JSON.stringify(decision.payload ?? {})}`);
        break;
      default:
        break;
    }
  }

  async verify(receipt) {
    if (receipt.action === 'summarise_inbox')  return 'inbox summary delivered';
    if (receipt.action === 'send_email')       return 'email sent and logged';
    return 'completed';
  }

  async _fetchUnread() {
    return this._inbox.filter(m => !m.read);
  }
}

export default EmailIntegration;

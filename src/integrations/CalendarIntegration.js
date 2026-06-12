import { BaseIntegration } from './BaseIntegration.js';

/**
 * CalendarIntegration — observes upcoming calendar events and emits signals.
 *
 * In production this would connect to Google Calendar / Apple Calendar.
 * The stub below shows the interface Orlix expects from any calendar connector.
 *
 * To add real calendar access, override `_fetchEvents()` with your API call.
 */
export class CalendarIntegration extends BaseIntegration {
  constructor(config = {}) {
    super('google-calendar', config);
    this._events = config.events ?? [];
  }

  async connect() {
    // TODO: exchange OAuth token with Google Calendar API
    // const { client_id, client_secret, refresh_token } = this.config;
    await super.connect();
  }

  async observe() {
    const events  = await this._fetchEvents();
    const signals = [];

    for (const event of events) {
      const start     = new Date(event.startTime);
      const msUntil   = start - Date.now();
      const minUntil  = msUntil / 60_000;

      if (minUntil > 0 && minUntil <= 60) {
        signals.push(this._signal('calendar_event', {
          title:     event.title,
          startTime: event.startTime,
          endTime:   event.endTime,
          location:  event.location ?? null,
          minutesUntilStart: Math.round(minUntil),
        }));
      }

      if (event.blocksWork && minUntil > 0 && minUntil <= 120) {
        signals.push(this._signal('calendar_block', {
          title:    event.title,
          duration: event.durationMinutes,
        }));
      }
    }

    return signals;
  }

  async execute(decision) {
    if (decision.action === 'send_calendar_reminder') {
      const ctx = decision.context;
      // In production: send notification via OS / Slack / email
      console.log(`[CalendarIntegration] Reminder: ${ctx}`);
    }
  }

  async verify(receipt) {
    if (receipt.action === 'send_calendar_reminder') return 'reminder delivered';
    return 'completed';
  }

  /** Override this to fetch real events from the calendar API. */
  async _fetchEvents() {
    return this._events;
  }
}

export default CalendarIntegration;

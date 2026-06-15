import { BaseIntegration } from './BaseIntegration.js';
import type { CalendarEvent, Decision, Receipt, Signal } from '../types/index.js';

interface CalendarConfig {
  events?: CalendarEvent[];
  reminderWindowMinutes?: number;
}

export class CalendarIntegration extends BaseIntegration {
  private _events: CalendarEvent[];
  private _window: number;

  constructor(config: CalendarConfig = {}) {
    super('google-calendar', config as Record<string, unknown>);
    this._events = config.events ?? [];
    this._window = config.reminderWindowMinutes ?? 60;
  }

  async observe(): Promise<Omit<Signal, 'id'>[]> {
    const events = await this._fetch();
    const signals: Omit<Signal, 'id'>[] = [];

    for (const event of events) {
      const start = new Date(event.startTime);
      const minLeft = (start.getTime() - Date.now()) / 60_000;

      if (minLeft > 0 && minLeft <= this._window) {
        signals.push(
          this.signal('calendar_event', {
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location ?? null,
            minutesUntilStart: Math.round(minLeft),
          }),
        );
      }

      if (event.blocksWork && minLeft > 0 && minLeft <= 120) {
        signals.push(
          this.signal('calendar_block', {
            title: event.title,
            duration: event.durationMinutes ?? 0,
          }),
        );
      }
    }
    return signals;
  }

  execute(decision: Decision): Promise<void> {
    if (decision.action === 'send_calendar_reminder') {
      console.log(`[CalendarIntegration] Reminder: ${decision.context}`);
    }
    return Promise.resolve();
  }

  verify(receipt: Receipt): Promise<string> {
    return Promise.resolve(
      receipt.action === 'send_calendar_reminder' ? 'reminder delivered' : 'completed',
    );
  }

  /** Override to connect to a real calendar API. */
  protected _fetch(): Promise<CalendarEvent[]> {
    return Promise.resolve(this._events);
  }
}

export default CalendarIntegration;

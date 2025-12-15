import { randomUUID } from 'crypto';
import { EventType } from '@martech/types';
import { NormalizedEvent } from '../repositories/event.repository';
import { RawEvent } from '../validators/event.validator';

export function normalizeEvent(rawEvent: RawEvent): NormalizedEvent {
  return {
    eventId: randomUUID(),
    userId: rawEvent.userId,
    sessionId: rawEvent.sessionId,
    type: rawEvent.type as EventType,
    payload: rawEvent.payload || {},
    occurredAt: rawEvent.occurredAt ? new Date(rawEvent.occurredAt) : new Date(),
    receivedAt: new Date(),
  };
}

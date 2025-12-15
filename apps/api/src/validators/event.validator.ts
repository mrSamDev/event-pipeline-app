import { EventType } from '@martech/types';

export interface RawEvent {
  userId: string;
  sessionId: string;
  type: string;
  payload?: Record<string, any>;
  occurredAt?: string | Date;
}

export interface ValidationError {
  error: string;
  message: string;
}

export function validateRawEvent(rawEvent: RawEvent): ValidationError | null {
  if (!rawEvent.userId || typeof rawEvent.userId !== 'string') {
    return {
      error: 'Bad Request',
      message: 'Missing or invalid required field: userId',
    };
  }

  if (!rawEvent.sessionId || typeof rawEvent.sessionId !== 'string') {
    return {
      error: 'Bad Request',
      message: 'Missing or invalid required field: sessionId',
    };
  }

  if (!rawEvent.type || typeof rawEvent.type !== 'string') {
    return {
      error: 'Bad Request',
      message: 'Missing or invalid required field: type',
    };
  }

  if (!Object.values(EventType).includes(rawEvent.type as EventType)) {
    return {
      error: 'Bad Request',
      message: `Invalid event type: ${rawEvent.type}. Must be one of: ${Object.values(EventType).join(', ')}`,
    };
  }

  return null;
}

export function validateDate(dateValue: string | Date): Date | null {
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function validateLimit(limit: string): number | null {
  const limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
    return null;
  }
  return limitNum;
}

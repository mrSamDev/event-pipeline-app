import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventType } from '@martech/types';
import { normalizeEvent } from './eventNormalizer';

describe('normalizeEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  it('creates normalized event with all fields', () => {
    const rawEvent = {
      userId: 'user123',
      sessionId: 'session456',
      type: EventType.PAGE_VIEW,
      payload: { url: '/home', title: 'Home' },
      occurredAt: '2025-01-15T11:00:00Z',
    };

    const normalized = normalizeEvent(rawEvent);

    expect(normalized.userId).toBe('user123');
    expect(normalized.sessionId).toBe('session456');
    expect(normalized.type).toBe(EventType.PAGE_VIEW);
    expect(normalized.payload).toEqual({ url: '/home', title: 'Home' });
    expect(normalized.occurredAt).toEqual(new Date('2025-01-15T11:00:00Z'));
    expect(normalized.receivedAt).toEqual(new Date('2025-01-15T12:00:00Z'));
    expect(normalized.eventId).toBeDefined();
    expect(typeof normalized.eventId).toBe('string');
  });

  it('uses current time when occurredAt not provided', () => {
    const rawEvent = {
      userId: 'user123',
      sessionId: 'session456',
      type: EventType.BUTTON_CLICK,
    };

    const normalized = normalizeEvent(rawEvent);

    expect(normalized.occurredAt).toEqual(new Date('2025-01-15T12:00:00Z'));
    expect(normalized.receivedAt).toEqual(new Date('2025-01-15T12:00:00Z'));
  });

  it('uses empty object when payload not provided', () => {
    const rawEvent = {
      userId: 'user123',
      sessionId: 'session456',
      type: EventType.FORM_SUBMIT,
    };

    const normalized = normalizeEvent(rawEvent);

    expect(normalized.payload).toEqual({});
  });

  it('generates unique eventId for each event', () => {
    const rawEvent = {
      userId: 'user123',
      sessionId: 'session456',
      type: EventType.PAGE_VIEW,
    };

    const normalized1 = normalizeEvent(rawEvent);
    const normalized2 = normalizeEvent(rawEvent);

    expect(normalized1.eventId).not.toBe(normalized2.eventId);
  });

  it('converts string date to Date object', () => {
    const rawEvent = {
      userId: 'user123',
      sessionId: 'session456',
      type: EventType.PAGE_VIEW,
      occurredAt: '2025-01-15T10:30:00Z',
    };

    const normalized = normalizeEvent(rawEvent);

    expect(normalized.occurredAt).toBeInstanceOf(Date);
    expect(normalized.occurredAt.toISOString()).toBe('2025-01-15T10:30:00.000Z');
  });

  it('handles Date object as occurredAt', () => {
    const occurredDate = new Date('2025-01-15T10:30:00Z');
    const rawEvent = {
      userId: 'user123',
      sessionId: 'session456',
      type: EventType.PAGE_VIEW,
      occurredAt: occurredDate,
    };

    const normalized = normalizeEvent(rawEvent);

    expect(normalized.occurredAt).toBeInstanceOf(Date);
    expect(normalized.occurredAt.getTime()).toBe(occurredDate.getTime());
  });
});

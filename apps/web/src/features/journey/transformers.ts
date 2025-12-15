import type { ApiEvent, AppEvent, SessionGroup } from './schemas';

export const journeyTransformer = {
  fromAPI(apiEvent: ApiEvent): AppEvent {
    const occurredAt = new Date(apiEvent.occurredAt);
    const receivedAt = new Date(apiEvent.receivedAt);

    return {
      eventId: apiEvent.eventId,
      userId: apiEvent.userId,
      sessionId: apiEvent.sessionId,
      type: apiEvent.type,
      payload: apiEvent.payload,
      occurredAt,
      receivedAt,
      formattedTime: occurredAt.toLocaleTimeString(),
      formattedTimestamp: occurredAt.toLocaleString(),
    };
  },

  groupBySession(events: AppEvent[]): SessionGroup[] {
    const sessionMap = new Map<string, AppEvent[]>();

    events.forEach((event) => {
      const existing = sessionMap.get(event.sessionId) || [];
      existing.push(event);
      sessionMap.set(event.sessionId, existing);
    });

    return Array.from(sessionMap.entries())
      .map(([sessionId, sessionEvents]) => {
        const sortedEvents = sessionEvents.sort(
          (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
        );

        const startTime = sortedEvents[0].occurredAt;
        const endTime = sortedEvents[sortedEvents.length - 1].occurredAt;

        return {
          sessionId,
          events: sortedEvents,
          startTime,
          endTime,
          formattedStartTime: startTime.toLocaleString(),
          formattedEndTime: endTime.toLocaleString(),
          eventCount: sortedEvents.length,
        };
      })
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  },
};

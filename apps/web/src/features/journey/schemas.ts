import { z } from 'zod';

const apiEventSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.string(),
  receivedAt: z.string(),
});

const appEventSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.instanceof(Date),
  receivedAt: z.instanceof(Date),
  formattedTime: z.string(),
  formattedTimestamp: z.string(),
});

const sessionGroupSchema = z.object({
  sessionId: z.string(),
  events: z.array(appEventSchema),
  startTime: z.instanceof(Date),
  endTime: z.instanceof(Date),
  formattedStartTime: z.string(),
  formattedEndTime: z.string(),
  eventCount: z.number(),
});

const apiJourneyResponseSchema = z.object({
  userId: z.string(),
  count: z.number(),
  events: z.array(apiEventSchema),
});

export type ApiEvent = z.infer<typeof apiEventSchema>;
export type AppEvent = z.infer<typeof appEventSchema>;
export type SessionGroup = z.infer<typeof sessionGroupSchema>;
export type ApiJourneyResponse = z.infer<typeof apiJourneyResponseSchema>;

export {
  apiEventSchema,
  appEventSchema,
  sessionGroupSchema,
  apiJourneyResponseSchema,
};

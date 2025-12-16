import { z } from 'zod';

const eventByTypeSchema = z.object({
  type: z.string(),
  count: z.number(),
});

const eventByDaySchema = z.object({
  date: z.string(),
  count: z.number(),
});

const apiStatsSchema = z.object({
  totalUsers: z.number(),
  totalEvents: z.number(),
  eventsByType: z.array(eventByTypeSchema),
  eventsByDay: z.array(eventByDaySchema),
});

const appStatsSchema = z.object({
  totalUsers: z.number(),
  totalEvents: z.number(),
  avgEventsPerUser: z.number(),
  eventsByType: z.array(eventByTypeSchema),
  eventsByDay: z.array(eventByDaySchema),
});

export type EventByType = z.infer<typeof eventByTypeSchema>;
export type EventByDay = z.infer<typeof eventByDaySchema>;
export type ApiStats = z.infer<typeof apiStatsSchema>;
export type AppStats = z.infer<typeof appStatsSchema>;

export { apiStatsSchema, appStatsSchema, eventByTypeSchema, eventByDaySchema };

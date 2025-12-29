import { z } from "zod";

const apiUserMetricsSchema = z.object({
	userId: z.string(),
	totalSessions: z.number(),
	totalEvents: z.number(),
	lastActive: z.string(),
});

const apiPaginatedUsersSchema = z.object({
	users: z.array(apiUserMetricsSchema),
	totalCount: z.number(),
	page: z.number(),
	pageSize: z.number(),
	totalPages: z.number(),
});

const appUserMetricsSchema = z.object({
	userId: z.string(),
	totalSessions: z.number(),
	totalEvents: z.number(),
	lastActive: z.instanceof(Date),
	formattedLastActive: z.string(),
});

const appPaginatedUsersSchema = z.object({
	users: z.array(appUserMetricsSchema),
	totalCount: z.number(),
	page: z.number(),
	pageSize: z.number(),
	totalPages: z.number(),
});

export type ApiUserMetrics = z.infer<typeof apiUserMetricsSchema>;
export type AppUserMetrics = z.infer<typeof appUserMetricsSchema>;
export type ApiPaginatedUsers = z.infer<typeof apiPaginatedUsersSchema>;
export type AppPaginatedUsers = z.infer<typeof appPaginatedUsersSchema>;

export {
	apiUserMetricsSchema,
	appUserMetricsSchema,
	apiPaginatedUsersSchema,
	appPaginatedUsersSchema,
};

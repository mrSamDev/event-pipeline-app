import type { ApiStats, AppStats } from "./schemas";

export const analyticsTransformer = {
	fromAPI(apiData: ApiStats): AppStats {
		const avgEventsPerUser =
			apiData.totalUsers > 0
				? Math.round(apiData.totalEvents / apiData.totalUsers)
				: 0;

		return {
			totalUsers: apiData.totalUsers,
			totalEvents: apiData.totalEvents,
			avgEventsPerUser,
			eventsByType: apiData.eventsByType,
			eventsByDay: apiData.eventsByDay,
		};
	},

	toAPI(appData: AppStats): ApiStats {
		return {
			totalUsers: appData.totalUsers,
			totalEvents: appData.totalEvents,
			eventsByType: appData.eventsByType,
			eventsByDay: appData.eventsByDay,
		};
	},
};

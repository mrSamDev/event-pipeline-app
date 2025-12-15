import type { ApiUserMetrics, AppUserMetrics, ApiPaginatedUsers, AppPaginatedUsers } from './schemas';

export const userMetricsTransformer = {
  fromAPI(apiData: ApiUserMetrics): AppUserMetrics {
    const lastActive = new Date(apiData.lastActive);

    return {
      userId: apiData.userId,
      totalSessions: apiData.totalSessions,
      totalEvents: apiData.totalEvents,
      lastActive,
      formattedLastActive: lastActive.toLocaleString(),
    };
  },

  toAPI(appData: AppUserMetrics): ApiUserMetrics {
    return {
      userId: appData.userId,
      totalSessions: appData.totalSessions,
      totalEvents: appData.totalEvents,
      lastActive: appData.lastActive.toISOString(),
    };
  },
};

export const paginatedUsersTransformer = {
  fromAPI(apiData: ApiPaginatedUsers): AppPaginatedUsers {
    return {
      users: apiData.users.map(user => userMetricsTransformer.fromAPI(user)),
      totalCount: apiData.totalCount,
      page: apiData.page,
      pageSize: apiData.pageSize,
      totalPages: apiData.totalPages,
    };
  },
};

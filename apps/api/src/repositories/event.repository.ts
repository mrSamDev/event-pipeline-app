import type { IEvent } from "@martech/types";
import {
	type AnalyticsStats,
	getAnalyticsStats,
	getUserMetrics,
	type UserMetrics,
} from "./eventAnalytics";
import { bulkInsert as doBulkInsert } from "./eventBulkInsert";
import {
	getEventCount as doGetEventCount,
	getUserJourney as doGetUserJourney,
	type UserJourneyOptions,
} from "./eventQuery";

export interface NormalizedEvent extends IEvent {}

export type { UserJourneyOptions, UserMetrics, AnalyticsStats };
export type { EventDayCount, EventTypeCount } from "./eventAnalytics";

export class EventRepository {
	async bulkInsert(events: NormalizedEvent[]): Promise<void> {
		return doBulkInsert(events);
	}

	async getUserJourney(
		userId: string,
		options: UserJourneyOptions = {},
	): Promise<IEvent[]> {
		return doGetUserJourney(userId, options);
	}

	async getEventCount(): Promise<number> {
		return doGetEventCount();
	}

	async getUserMetrics(options?: {
		page?: number;
		pageSize?: number;
	}): Promise<{
		users: UserMetrics[];
		totalCount: number;
		page: number;
		pageSize: number;
		totalPages: number;
	}> {
		return getUserMetrics(options);
	}

	async getAnalyticsStats(): Promise<AnalyticsStats> {
		return getAnalyticsStats();
	}
}

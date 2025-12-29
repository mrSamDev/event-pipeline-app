import { DatabaseError, getErrorMessage, isError } from "../errors/AppError";
import { Event } from "../models/Event";
import { logger } from "../observability/logger";

export interface UserMetrics {
	userId: string;
	totalEvents: number;
	totalSessions: number;
	lastActive: Date;
}

export interface EventTypeCount {
	type: string;
	count: number;
}

export interface EventDayCount {
	date: string;
	count: number;
}

export interface AnalyticsStats {
	totalUsers: number;
	totalEvents: number;
	eventsByType: EventTypeCount[];
	eventsByDay: EventDayCount[];
}

export async function getUserMetrics(options?: {
	page?: number;
	pageSize?: number;
}): Promise<{
	users: UserMetrics[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
}> {
	try {
		const page = options?.page || 1;
		const pageSize = options?.pageSize || 10;
		const skip = (page - 1) * pageSize;

		const metricsAggregation = [
			{
				$group: {
					_id: "$userId",
					totalEvents: { $sum: 1 },
					totalSessions: { $addToSet: "$sessionId" },
					lastActive: { $max: "$occurredAt" },
				},
			},
			{
				$project: {
					userId: "$_id",
					totalEvents: 1,
					totalSessions: { $size: "$totalSessions" },
					lastActive: 1,
					_id: 0,
				},
			},
			{
				$sort: { lastActive: -1 as -1 },
			},
		];

		const [metrics, countResult] = await Promise.all([
			Event.aggregate([
				...metricsAggregation,
				{ $skip: skip },
				{ $limit: pageSize },
			]),
			Event.aggregate([...metricsAggregation, { $count: "total" }]),
		]);

		const totalCount = countResult[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / pageSize);

		logger.debug("[EventRepository] Retrieved user metrics", {
			page,
			pageSize,
			totalCount,
			userCount: metrics.length,
		});

		return {
			users: metrics,
			totalCount,
			page,
			pageSize,
			totalPages,
		};
	} catch (error: unknown) {
		const errorMessage = getErrorMessage(error);
		const errorDetails = isError(error) ? { stack: error.stack } : {};

		logger.error("[EventRepository] getUserMetrics failed", {
			error: errorMessage,
			...errorDetails,
		});

		throw new DatabaseError("Failed to retrieve user metrics from database", {
			error: errorMessage,
		});
	}
}

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
	try {
		const totalUsers = await Event.distinct("userId").then(
			(users) => users.length,
		);
		const totalEvents = await Event.countDocuments();

		const eventsByType = await Event.aggregate([
			{
				$group: {
					_id: "$type",
					count: { $sum: 1 },
				},
			},
			{
				$project: {
					type: "$_id",
					count: 1,
					_id: 0,
				},
			},
			{
				$sort: { count: -1 },
			},
		]);

		const eventsByDay = await Event.aggregate([
			{
				$group: {
					_id: {
						$dateToString: { format: "%Y-%m-%d", date: "$occurredAt" },
					},
					count: { $sum: 1 },
				},
			},
			{
				$project: {
					date: "$_id",
					count: 1,
					_id: 0,
				},
			},
			{
				$sort: { date: 1 },
			},
		]);

		logger.debug("[EventRepository] Retrieved analytics stats", {
			totalUsers,
			totalEvents,
			eventTypeCount: eventsByType.length,
			daysWithEvents: eventsByDay.length,
		});

		return {
			totalUsers,
			totalEvents,
			eventsByType,
			eventsByDay,
		};
	} catch (error: unknown) {
		const errorMessage = getErrorMessage(error);
		const errorDetails = isError(error) ? { stack: error.stack } : {};

		logger.error("[EventRepository] getAnalyticsStats failed", {
			error: errorMessage,
			...errorDetails,
		});

		throw new DatabaseError(
			"Failed to retrieve analytics stats from database",
			{
				error: errorMessage,
			},
		);
	}
}

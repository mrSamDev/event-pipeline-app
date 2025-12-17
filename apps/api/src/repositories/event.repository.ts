import type { IEvent } from "@martech/types";
import { Event, type IEventDocument } from "../models/Event";

// Normalized event shape (used internally by the service layer)
export interface NormalizedEvent extends IEvent {}

// Query options for user journey retrieval
export interface UserJourneyOptions {
	from?: Date; // Start date filter (inclusive)
	to?: Date; // End date filter (inclusive)
	limit?: number; // Max number of events to return (default: 100)
}

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

// Repository pattern: Abstracts MongoDB operations from business logic
// This layer handles all database access, keeping service layer clean
export class EventRepository {
	/**
	 * Bulk insert events into MongoDB
	 * Uses insertMany with ordered: false for optimal performance
	 *
	 * @param events - Array of normalized events to insert
	 * @returns Promise<void> - Resolves when insert completes (or partially completes)
	 *
	 * Key behaviors:
	 * - ordered: false allows parallel inserts and continues on duplicate errors
	 * - Duplicate events (E11000 error) are silently ignored (idempotency)
	 * - Single network round trip for entire batch (500 events in ~10ms)
	 * - Uses lean mode to skip Mongoose document hydration
	 */
	async bulkInsert(events: NormalizedEvent[]): Promise<void> {
		try {
			// Map events to use eventId as _id
			const documents = events.map((event) => ({
				_id: event.eventId,
				userId: event.userId,
				sessionId: event.sessionId,
				type: event.type,
				payload: event.payload,
				occurredAt: event.occurredAt,
				receivedAt: event.receivedAt,
			}));

			// insertMany with ordered: false for best performance
			// - ordered: false means inserts continue even if some fail (e.g., duplicate eventId)
			// - This is critical for high-throughput scenarios where duplicates are expected
			await Event.insertMany(documents, {
				ordered: false, // Continue on errors
				lean: true, // Skip Mongoose document hydration (faster)
			});

			// Success: all events inserted (or duplicates skipped)
			if (process.env.NODE_ENV !== "production") {
				console.log(`[EventRepository] Bulk inserted ${events.length} events`);
			}
		} catch (error: any) {
			// Handle duplicate key errors gracefully (E11000)
			// This is expected when clients retry requests or send duplicate events
			if (error.code === 11000 || error.name === "MongoBulkWriteError") {
				// Some events were duplicates, but some may have succeeded
				const insertedCount = error.result?.nInserted || 0;
				const duplicateCount = events.length - insertedCount;

				if (process.env.NODE_ENV !== "production") {
					console.log(
						`[EventRepository] Bulk insert completed with ${duplicateCount} duplicates ignored, ${insertedCount} inserted`,
					);
				}

				// Don't throw - duplicates are expected (idempotency)
				return;
			}

			// Other errors (e.g., connection lost, validation failed) should propagate
			console.error("[EventRepository] Bulk insert failed:", {
				error: error.message,
				eventCount: events.length,
			});
			throw error;
		}
	}

	/**
	 * Retrieve a user's event journey with optional filtering
	 * Uses compound index { userId: 1, occurredAt: -1 } for efficient queries
	 *
	 * @param userId - User identifier to query
	 * @param options - Optional filters (date range, limit)
	 * @returns Promise<IEvent[]> - Array of events sorted by occurredAt descending
	 *
	 * Query performance:
	 * - Uses IXSCAN (index scan) not COLLSCAN (collection scan)
	 * - Compound index enables sorted retrieval without in-memory sort
	 * - .lean() returns plain JS objects (2-5x faster than Mongoose documents)
	 */
	async getUserJourney(
		userId: string,
		options: UserJourneyOptions = {},
	): Promise<IEvent[]> {
		try {
			// Build query object dynamically based on options
			const query: any = { userId };

			// Add date range filter if provided
			if (options.from || options.to) {
				query.occurredAt = {};
				if (options.from) {
					query.occurredAt.$gte = options.from; // Greater than or equal
				}
				if (options.to) {
					query.occurredAt.$lte = options.to; // Less than or equal
				}
			}

			// Execute query with compound index: { userId: 1, occurredAt: -1 }
			const documents = await Event.find(query)
				.sort({ occurredAt: -1 }) // Recent events first (uses index)
				.limit(options.limit || 100) // Default to 100 events
				.lean<IEventDocument[]>() // Return plain objects (faster)
				.exec();

			// Map documents back to IEvent interface (convert _id back to eventId)
			const events: IEvent[] = documents.map((doc) => ({
				eventId: doc._id,
				userId: doc.userId,
				sessionId: doc.sessionId,
				type: doc.type,
				payload: doc.payload,
				occurredAt: doc.occurredAt,
				receivedAt: doc.receivedAt,
			}));

			console.log(
				`[EventRepository] Retrieved ${events.length} events for user ${userId}`,
			);

			return events;
		} catch (error: any) {
			console.error("[EventRepository] getUserJourney failed:", {
				error: error.message,
				userId,
				options,
			});
			throw error;
		}
	}

	/**
	 * Get total event count (useful for monitoring/debugging)
	 * Note: This is an expensive operation on large collections, use sparingly
	 */
	async getEventCount(): Promise<number> {
		try {
			return await Event.countDocuments();
		} catch (error: any) {
			console.error("[EventRepository] getEventCount failed:", error.message);
			throw error;
		}
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

			return {
				users: metrics,
				totalCount,
				page,
				pageSize,
				totalPages,
			};
		} catch (error: any) {
			console.error("[EventRepository] getUserMetrics failed:", error.message);
			throw error;
		}
	}

	async getAnalyticsStats(): Promise<AnalyticsStats> {
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

			return {
				totalUsers,
				totalEvents,
				eventsByType,
				eventsByDay,
			};
		} catch (error: any) {
			console.error(
				"[EventRepository] getAnalyticsStats failed:",
				error.message,
			);
			throw error;
		}
	}
}

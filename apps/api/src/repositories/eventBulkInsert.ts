import { DatabaseError, getErrorMessage, isError } from "../errors/AppError";
import { Event } from "../models/Event";
import { logger } from "../observability/logger";
import type { NormalizedEvent } from "./event.repository";

interface MongoBulkWriteError {
	code: number;
	name: string;
	result?: { nInserted?: number };
}

function isMongoBulkWriteError(err: unknown): err is MongoBulkWriteError {
	return (
		typeof err === "object" && err !== null && ("code" in err || "name" in err)
	);
}

export async function bulkInsert(events: NormalizedEvent[]): Promise<void> {
	try {
		const documents = events.map((event) => ({
			_id: event.eventId,
			userId: event.userId,
			sessionId: event.sessionId,
			type: event.type,
			payload: event.payload,
			occurredAt: event.occurredAt,
			receivedAt: event.receivedAt,
		}));

		await Event.insertMany(documents, {
			ordered: false,
			lean: true,
		});

		if (process.env.NODE_ENV !== "production") {
			logger.debug("[EventRepository] Bulk inserted events", {
				count: events.length,
			});
		}
	} catch (error: unknown) {
		if (
			isMongoBulkWriteError(error) &&
			(error.code === 11000 || error.name === "MongoBulkWriteError")
		) {
			const insertedCount = error.result?.nInserted || 0;
			const duplicateCount = events.length - insertedCount;

			if (process.env.NODE_ENV !== "production") {
				logger.info("[EventRepository] Bulk insert completed with duplicates", {
					duplicatesIgnored: duplicateCount,
					inserted: insertedCount,
				});
			}

			return;
		}

		const errorMessage = getErrorMessage(error);
		const errorDetails = isError(error) ? { stack: error.stack } : {};

		logger.error("[EventRepository] Bulk insert failed", {
			error: errorMessage,
			eventCount: events.length,
			...errorDetails,
		});

		throw new DatabaseError("Failed to insert events into database", {
			eventCount: events.length,
			error: errorMessage,
		});
	}
}

import type { IEvent } from "@martech/types";
import { DatabaseError, getErrorMessage, isError } from "../errors/AppError";
import type { IEventDocument } from "../models/Event";
import { Event } from "../models/Event";
import { logger } from "../observability/logger";

export interface UserJourneyOptions {
	from?: Date;
	to?: Date;
	limit?: number;
}

interface QueryFilter {
	userId: string;
	occurredAt?: {
		$gte?: Date;
		$lte?: Date;
	};
}

export async function getUserJourney(
	userId: string,
	options: UserJourneyOptions = {},
): Promise<IEvent[]> {
	try {
		const query: QueryFilter = { userId };

		if (options.from || options.to) {
			query.occurredAt = {};
			if (options.from) {
				query.occurredAt.$gte = options.from;
			}
			if (options.to) {
				query.occurredAt.$lte = options.to;
			}
		}

		const documents = await Event.find(query)
			.sort({ occurredAt: -1 })
			.limit(options.limit || 100)
			.lean<IEventDocument[]>()
			.exec();

		const events: IEvent[] = documents.map((doc) => ({
			eventId: doc._id,
			userId: doc.userId,
			sessionId: doc.sessionId,
			type: doc.type,
			payload: doc.payload,
			occurredAt: doc.occurredAt,
			receivedAt: doc.receivedAt,
		}));

		logger.debug("[EventRepository] Retrieved user journey", {
			userId,
			eventCount: events.length,
			hasDateFilter: !!(options.from || options.to),
		});

		return events;
	} catch (error: unknown) {
		const errorMessage = getErrorMessage(error);
		const errorDetails = isError(error) ? { stack: error.stack } : {};

		logger.error("[EventRepository] getUserJourney failed", {
			error: errorMessage,
			userId,
			options,
			...errorDetails,
		});

		throw new DatabaseError("Failed to retrieve user journey from database", {
			userId,
			error: errorMessage,
		});
	}
}

export async function getEventCount(): Promise<number> {
	try {
		return await Event.countDocuments();
	} catch (error: unknown) {
		const errorMessage = getErrorMessage(error);
		const errorDetails = isError(error) ? { stack: error.stack } : {};

		logger.error("[EventRepository] getEventCount failed", {
			error: errorMessage,
			...errorDetails,
		});

		throw new DatabaseError("Failed to count events in database", {
			error: errorMessage,
		});
	}
}

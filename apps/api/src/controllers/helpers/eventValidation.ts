import { ValidationError } from "../../errors/AppError";
import type { NormalizedEvent } from "../../repositories/event.repository";
import { validateRawEvent } from "../../validators/event.validator";

export function validateAndNormalizeEvents(
	rawEvents: unknown[],
): NormalizedEvent[] {
	const normalizedEvents: NormalizedEvent[] = [];

	for (let i = 0; i < rawEvents.length; i++) {
		try {
			const validatedEvent = validateRawEvent(rawEvents[i]);

			const normalized: NormalizedEvent = {
				eventId: validatedEvent.eventId,
				userId: validatedEvent.userId,
				sessionId: validatedEvent.sessionId,
				type: validatedEvent.type,
				payload: validatedEvent.payload,
				occurredAt: validatedEvent.occurredAt,
				receivedAt: new Date(),
			};

			normalizedEvents.push(normalized);
		} catch (error: unknown) {
			if (error instanceof ValidationError) {
				throw new ValidationError(`Event at index ${i}: ${error.message}`, {
					eventIndex: i,
					originalError: error.message,
				});
			}
			throw error;
		}
	}

	return normalizedEvents;
}

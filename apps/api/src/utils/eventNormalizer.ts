import type { NormalizedEvent } from "../repositories/event.repository";
import type { ValidatedRawEvent } from "../validators/event.validator";

/**
 * Normalize a validated raw event into the internal event format
 * This function is now mostly a passthrough since validation handles normalization
 */
export function normalizeEvent(
	validatedEvent: ValidatedRawEvent,
): NormalizedEvent {
	return {
		eventId: validatedEvent.eventId,
		userId: validatedEvent.userId,
		sessionId: validatedEvent.sessionId,
		type: validatedEvent.type,
		payload: validatedEvent.payload as Record<string, unknown>,
		occurredAt: validatedEvent.occurredAt,
		receivedAt: new Date(),
	};
}

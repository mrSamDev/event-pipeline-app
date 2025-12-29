import { EventType } from "@martech/types";
import { ValidationError as AppValidationError } from "../errors/AppError";
import {
	type EventPayload,
	isValidDate,
	isValidEventType,
	isValidUUID,
	validateEventPayload,
} from "../schemas/event.schema";

/**
 * Type guard to check if value is a string
 */
function isString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

/**
 * Type guard to check if value is unknown object
 */
function isUnknownObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Raw event input structure (unknown shape from external sources)
 */
export interface RawEventInput {
	eventId?: unknown;
	userId?: unknown;
	sessionId?: unknown;
	type?: unknown;
	payload?: unknown;
	occurredAt?: unknown;
}

/**
 * Validated raw event structure
 */
export interface ValidatedRawEvent {
	eventId: string;
	userId: string;
	sessionId: string;
	type: EventType;
	payload: EventPayload;
	occurredAt: Date;
}

/**
 * Validate and sanitize raw event input from external sources
 * Throws ValidationError if input is invalid
 */
export function validateRawEvent(rawEvent: unknown): ValidatedRawEvent {
	// First, ensure the input is an object
	if (!isUnknownObject(rawEvent)) {
		throw new AppValidationError("Event must be an object");
	}

	const input = rawEvent as RawEventInput;

	// Validate eventId
	if (!isValidUUID(input.eventId)) {
		throw new AppValidationError(
			"Missing or invalid required field: eventId (must be a valid UUID v4)",
		);
	}

	// Validate userId
	if (!isString(input.userId)) {
		throw new AppValidationError(
			"Missing or invalid required field: userId (must be a non-empty string)",
		);
	}

	// Validate sessionId
	if (!isString(input.sessionId)) {
		throw new AppValidationError(
			"Missing or invalid required field: sessionId (must be a non-empty string)",
		);
	}

	// Validate type
	if (!isValidEventType(input.type)) {
		throw new AppValidationError(
			`Invalid event type: ${String(input.type)}. Must be one of: ${Object.values(EventType).join(", ")}`,
		);
	}

	// Validate occurredAt
	let occurredAt: Date;
	if (input.occurredAt === undefined || input.occurredAt === null) {
		occurredAt = new Date();
	} else if (!isValidDate(input.occurredAt)) {
		throw new AppValidationError(
			"Invalid occurredAt: must be a valid date string or Date object",
		);
	} else if (input.occurredAt instanceof Date) {
		occurredAt = input.occurredAt;
	} else if (isString(input.occurredAt)) {
		occurredAt = new Date(input.occurredAt);
	} else {
		throw new AppValidationError(
			"Invalid occurredAt: must be a valid date string or Date object",
		);
	}

	// Validate payload with type-specific validation
	const payload = input.payload ?? {};
	const validatedPayload = validateEventPayload(input.type, payload);

	return {
		eventId: input.eventId,
		userId: input.userId,
		sessionId: input.sessionId,
		type: input.type,
		payload: validatedPayload,
		occurredAt,
	};
}

/**
 * Validate date parameter from query strings
 * Throws ValidationError if invalid
 */
export function validateDateParam(dateValue: unknown): Date {
	if (!isValidDate(dateValue)) {
		throw new AppValidationError(
			"Invalid date parameter: must be a valid date string or Date object",
		);
	}

	if (dateValue instanceof Date) {
		return dateValue;
	}

	return new Date(dateValue as string);
}

/**
 * Validate limit parameter from query strings
 * Throws ValidationError if invalid
 */
export function validateLimitParam(limit: unknown): number {
	if (typeof limit !== "string" && typeof limit !== "number") {
		throw new AppValidationError(
			"Invalid limit parameter: must be a number or numeric string",
		);
	}

	const limitNum = typeof limit === "number" ? limit : parseInt(limit, 10);

	if (Number.isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
		throw new AppValidationError(
			"Invalid limit parameter: must be between 1 and 1000",
		);
	}

	return limitNum;
}

/**
 * Validate offset parameter from query strings
 * Throws ValidationError if invalid
 */
export function validateOffsetParam(offset: unknown): number {
	if (offset === undefined || offset === null) {
		return 0;
	}

	if (typeof offset !== "string" && typeof offset !== "number") {
		throw new AppValidationError(
			"Invalid offset parameter: must be a number or numeric string",
		);
	}

	const offsetNum = typeof offset === "number" ? offset : parseInt(offset, 10);

	if (Number.isNaN(offsetNum) || offsetNum < 0) {
		throw new AppValidationError(
			"Invalid offset parameter: must be a non-negative number",
		);
	}

	return offsetNum;
}

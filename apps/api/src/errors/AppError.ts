/**
 * Base Application Error
 * All custom errors should extend this class
 */
export abstract class AppError extends Error {
	public readonly statusCode: number;
	public readonly isOperational: boolean;
	public readonly context?: Record<string, unknown>;

	constructor(
		message: string,
		statusCode: number,
		isOperational = true,
		context?: Record<string, unknown>,
	) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);

		this.name = this.constructor.name;
		this.statusCode = statusCode;
		this.isOperational = isOperational;
		this.context = context;

		Error.captureStackTrace(this, this.constructor);
	}

	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			statusCode: this.statusCode,
			context: this.context,
		};
	}
}

/**
 * Validation Error - 400
 * Used for input validation failures
 */
export class ValidationError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 400, true, context);
	}
}

/**
 * Authentication Error - 401
 * Used when authentication fails
 */
export class AuthenticationError extends AppError {
	constructor(
		message = "Authentication failed",
		context?: Record<string, unknown>,
	) {
		super(message, 401, true, context);
	}
}

/**
 * Authorization Error - 403
 * Used when user lacks permissions
 */
export class AuthorizationError extends AppError {
	constructor(message = "Access forbidden", context?: Record<string, unknown>) {
		super(message, 403, true, context);
	}
}

/**
 * Not Found Error - 404
 * Used when a resource is not found
 */
export class NotFoundError extends AppError {
	constructor(
		resource: string,
		identifier?: string | number,
		context?: Record<string, unknown>,
	) {
		const message = identifier
			? `${resource} with identifier '${identifier}' not found`
			: `${resource} not found`;
		super(message, 404, true, context);
	}
}

/**
 * Conflict Error - 409
 * Used for resource conflicts (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 409, true, context);
	}
}

/**
 * Rate Limit Error - 429
 * Used when rate limits are exceeded
 */
export class RateLimitError extends AppError {
	constructor(
		message = "Rate limit exceeded",
		context?: Record<string, unknown>,
	) {
		super(message, 429, true, context);
	}
}

/**
 * Database Error - 500
 * Used for database operation failures
 */
export class DatabaseError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 500, true, context);
	}
}

/**
 * External Service Error - 502
 * Used when external service calls fail
 */
export class ExternalServiceError extends AppError {
	constructor(
		service: string,
		message?: string,
		context?: Record<string, unknown>,
	) {
		const errorMessage = message
			? `External service '${service}' error: ${message}`
			: `External service '${service}' is unavailable`;
		super(errorMessage, 502, true, context);
	}
}

/**
 * Internal Server Error - 500
 * Used for unexpected internal errors
 */
export class InternalServerError extends AppError {
	constructor(
		message = "Internal server error",
		context?: Record<string, unknown>,
	) {
		super(message, 500, false, context);
	}
}

/**
 * Type Guard to check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}

/**
 * Type Guard to check if error is Error
 */
export function isError(error: unknown): error is Error {
	return error instanceof Error;
}

/**
 * Safe error message extraction
 * Ensures we can always get a string message from any error
 */
export function getErrorMessage(error: unknown): string {
	if (isAppError(error)) {
		return error.message;
	}

	if (isError(error)) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	if (
		error &&
		typeof error === "object" &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}

	return "Unknown error occurred";
}

/**
 * Safe error status code extraction
 */
export function getErrorStatusCode(error: unknown): number {
	if (isAppError(error)) {
		return error.statusCode;
	}

	if (
		error &&
		typeof error === "object" &&
		"statusCode" in error &&
		typeof error.statusCode === "number"
	) {
		return error.statusCode;
	}

	return 500;
}

/**
 * Safe error context extraction
 */
export function getErrorContext(
	error: unknown,
): Record<string, unknown> | undefined {
	if (isAppError(error)) {
		return error.context;
	}

	return undefined;
}

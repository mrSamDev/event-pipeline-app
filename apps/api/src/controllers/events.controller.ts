import type { Request, Response } from "express";
import {
	getErrorMessage,
	getErrorStatusCode,
	isAppError,
	isError,
	ValidationError,
} from "../errors/AppError";
import { logger } from "../observability/logger";
import type { EventRepository } from "../repositories/event.repository";
import type { EventIngestionService } from "../services/eventIngestion.service";
import { validateAndNormalizeEvents } from "./helpers/eventValidation";
import { parsePaginationParams } from "./helpers/paginationParser";

export class EventsController {
	constructor(
		private ingestionService: EventIngestionService,
		private repository: EventRepository,
	) {}

	async ingestEvent(req: Request, res: Response): Promise<void> {
		try {
			if (!this.ingestionService.canAcceptEvent()) {
				res.status(429).json({
					error: "Too Many Requests",
					message: "Event buffer at capacity, try again shortly",
					retryAfter: 1,
				});
				return;
			}

			const rawEvents: unknown[] = Array.isArray(req.body)
				? req.body
				: [req.body];

			if (rawEvents.length === 0) {
				throw new ValidationError(
					"Request body must contain at least one event",
				);
			}

			if (rawEvents.length > 1000) {
				throw new ValidationError("Batch size cannot exceed 1000 events", {
					receivedCount: rawEvents.length,
				});
			}

			const normalizedEvents = validateAndNormalizeEvents(rawEvents);

			const addPromises = normalizedEvents.map((event) =>
				this.ingestionService.addEvent(event),
			);
			await Promise.all(addPromises);

			res.status(202).json({
				message: "Events accepted for processing",
				count: normalizedEvents.length,
				eventIds: normalizedEvents.map((e) => e.eventId),
			});
		} catch (error: unknown) {
			const errorMessage = getErrorMessage(error);
			const statusCode = getErrorStatusCode(error);

			if (statusCode >= 500) {
				const errorDetails = isError(error) ? { stack: error.stack } : {};
				logger.error("[EventsController] ingestEvent error", {
					error: errorMessage,
					...errorDetails,
				});
			} else if (process.env.NODE_ENV !== "production") {
				logger.debug("[EventsController] ingestEvent validation error", {
					error: errorMessage,
				});
			}

			res.status(statusCode).json({
				error: isAppError(error) ? error.name : "Internal Server Error",
				message: errorMessage,
			});
		}
	}

	async getUserJourney(req: Request, res: Response): Promise<void> {
		try {
			const { userId } = req.params;
			const { from, to, limit } = req.query;

			if (!userId || typeof userId !== "string") {
				throw new ValidationError("Invalid userId parameter");
			}

			const options: {
				from?: Date;
				to?: Date;
				limit?: number;
			} = {};

			if (from !== undefined) {
				const { validateDateParam } = await import(
					"../validators/event.validator"
				);
				options.from = validateDateParam(from);
			}

			if (to !== undefined) {
				const { validateDateParam } = await import(
					"../validators/event.validator"
				);
				options.to = validateDateParam(to);
			}

			if (limit !== undefined) {
				const { validateLimitParam } = await import(
					"../validators/event.validator"
				);
				options.limit = validateLimitParam(limit);
			}

			const events = await this.repository.getUserJourney(userId, options);

			res.status(200).json({
				userId,
				count: events.length,
				events,
			});
		} catch (error: unknown) {
			const errorMessage = getErrorMessage(error);
			const statusCode = getErrorStatusCode(error);
			const errorDetails = isError(error) ? { stack: error.stack } : {};

			logger.error("[EventsController] getUserJourney error", {
				error: errorMessage,
				userId: req.params.userId,
				...errorDetails,
			});

			res.status(statusCode).json({
				error: isAppError(error) ? error.name : "Internal Server Error",
				message: errorMessage,
			});
		}
	}

	async getStats(_req: Request, res: Response): Promise<void> {
		try {
			const stats = await this.repository.getAnalyticsStats();
			res.status(200).json(stats);
		} catch (error: unknown) {
			const errorMessage = getErrorMessage(error);
			const statusCode = getErrorStatusCode(error);
			const errorDetails = isError(error) ? { stack: error.stack } : {};

			logger.error("[EventsController] getStats error", {
				error: errorMessage,
				...errorDetails,
			});

			res.status(statusCode).json({
				error: isAppError(error) ? error.name : "Internal Server Error",
				message: errorMessage,
			});
		}
	}

	async getUsers(req: Request, res: Response): Promise<void> {
		try {
			const { page, pageSize } = parsePaginationParams(req.query);

			const result = await this.repository.getUserMetrics({
				page,
				pageSize,
			});

			res.status(200).json(result);
		} catch (error: unknown) {
			const errorMessage = getErrorMessage(error);
			const statusCode = getErrorStatusCode(error);
			const errorDetails = isError(error) ? { stack: error.stack } : {};

			logger.error("[EventsController] getUsers error", {
				error: errorMessage,
				...errorDetails,
			});

			res.status(statusCode).json({
				error: isAppError(error) ? error.name : "Internal Server Error",
				message: errorMessage,
			});
		}
	}
}

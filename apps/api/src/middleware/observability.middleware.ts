import type { NextFunction, Request, Response } from "express";
import { logger } from "../observability/logger";
import {
	activeRequestsGauge,
	httpRequestsTotal,
} from "../observability/metrics";

/**
 * Express middleware for request logging and metrics
 * Tracks all incoming HTTP requests with structured logs and Prometheus metrics
 */
export function observabilityMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const startTime = Date.now();

	// Increment active requests
	activeRequestsGauge.inc();

	// Log incoming request
	logger.info("Incoming request", {
		method: req.method,
		path: req.path,
		query: req.query,
		ip: req.ip,
		userAgent: req.get("user-agent"),
	});

	// Capture response finish event
	res.on("finish", () => {
		const duration = Date.now() - startTime;

		// Decrement active requests
		activeRequestsGauge.dec();

		// Record metrics
		httpRequestsTotal.inc({
			method: req.method,
			path: req.route?.path || req.path,
			status: res.statusCode,
		});

		// Log completed request
		const logLevel =
			res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
		logger.log(logLevel, "Request completed", {
			method: req.method,
			path: req.path,
			status: res.statusCode,
			duration: `${duration}ms`,
			contentLength: res.get("content-length"),
		});
	});

	next();
}

import mongoose from "mongoose";
import { dbConnectionGauge, logger } from "../observability";
import type { EventIngestionService } from "../services/eventIngestion.service";

export async function gracefulShutdown(
	signal: string,
	server: ReturnType<import("express").Express["listen"]> | undefined,
	ingestionService: EventIngestionService | undefined,
): Promise<void> {
	logger.info("Graceful shutdown initiated", { signal });

	try {
		if (server) {
			await new Promise<void>((resolve) => {
				server.close(() => {
					logger.info("HTTP server closed (no new connections)");
					resolve();
				});

				setTimeout(() => {
					logger.warn("Force closing HTTP server after timeout");
					resolve();
				}, 10000);
			});
		}

		if (ingestionService) {
			logger.info("Flushing buffer before shutdown...");
			await ingestionService.forceFlush();
			logger.info("Buffer flushed successfully");
		}

		if (mongoose.connection.readyState === 1) {
			await mongoose.connection.close(false);
			logger.info("Database connection closed");
			dbConnectionGauge.set({ state: "connected" }, 0);
		}

		logger.info("Graceful shutdown completed successfully");
		process.exit(0);
	} catch (error: any) {
		logger.error("Error during graceful shutdown", {
			error: error.message,
			stack: error.stack,
		});
		process.exit(1);
	}
}

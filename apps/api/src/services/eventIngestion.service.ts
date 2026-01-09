import {
	DatabaseError,
	getErrorMessage,
	InternalServerError,
	isError,
} from "../errors/AppError";
import { logger } from "../observability/logger";
import type {
	EventRepository,
	NormalizedEvent,
} from "../repositories/event.repository";
import { BufferManager } from "./bufferManager";
import { FlushCoordinator } from "./flushCoordinator";

interface BufferStats {
	bufferSize: number;
	activeFlushes: number;
	maxBufferSize: number;
	backpressureThreshold: number;
	maxConcurrentFlushes: number;
	bufferUtilization: number;
	totalEventsProcessed: number;
	totalFlushes: number;
	failedFlushes: number;
}

export class EventIngestionService {
	private buffer: BufferManager;
	private coordinator: FlushCoordinator;
	private isShuttingDown = false;

	private readonly maxBufferSize = 5000;
	private readonly flushIntervalMs = 100;
	private readonly backpressureThreshold = 50000;
	private readonly maxConcurrentFlushes = 20;

	constructor(private repository: EventRepository) {
		this.buffer = new BufferManager(
			this.maxBufferSize,
			this.backpressureThreshold,
		);
		this.coordinator = new FlushCoordinator(
			this.maxConcurrentFlushes,
			this.flushIntervalMs,
		);

		logger.info("[EventIngestionService] Initialized with config", {
			maxBufferSize: this.maxBufferSize,
			flushIntervalMs: this.flushIntervalMs,
			backpressureThreshold: this.backpressureThreshold,
			maxConcurrentFlushes: this.maxConcurrentFlushes,
		});
	}

	canAcceptEvent(): boolean {
		return this.buffer.canAcceptEvents(this.isShuttingDown);
	}

	async addEvent(event: NormalizedEvent): Promise<void> {
		if (this.isShuttingDown) {
			throw new InternalServerError("Service is shutting down", {
				bufferSize: this.buffer.size,
			});
		}

		this.buffer.add(event);

		if (
			this.buffer.size % 5000 === 0 &&
			process.env.NODE_ENV !== "production"
		) {
			logger.debug("[EventIngestionService] Buffer size milestone", {
				bufferSize: this.buffer.size,
			});
		}

		if (this.buffer.isOverThreshold && this.coordinator.canFlush()) {
			if (process.env.NODE_ENV !== "production") {
				logger.debug(
					"[EventIngestionService] Size threshold reached, triggering flush",
					{
						bufferSize: this.buffer.size,
					},
				);
			}
			this.scheduleFlush();
		}

		this.resetFlushTimer();
	}

	private scheduleFlush(): void {
		this.flush().catch((error: unknown) => {
			const errorMessage = getErrorMessage(error);
			logger.error("[EventIngestionService] Background flush failed", {
				error: errorMessage,
				bufferSize: this.buffer.size,
			});
		});
	}

	private async flush(): Promise<void> {
		if (this.buffer.size === 0) {
			return;
		}

		if (!this.coordinator.canFlush()) {
			if (process.env.NODE_ENV !== "production") {
				logger.debug("[EventIngestionService] Cannot flush, skipping", {
					stats: this.coordinator.stats,
				});
			}
			return;
		}

		if (!this.coordinator.acquireLock()) {
			logger.debug(
				"[EventIngestionService] Flush already in progress, skipping",
			);
			return;
		}

		try {
			const batch = this.buffer.extractBatch();
			const flushStartTime = Date.now();

			try {
				await this.repository.bulkInsert(batch);
				this.coordinator.recordSuccess();

				const flushDuration = Date.now() - flushStartTime;

				if (process.env.NODE_ENV !== "production") {
					logger.info("[EventIngestionService] Flush successful", {
						batchSize: batch.length,
						durationMs: flushDuration,
						remainingInBuffer: this.buffer.size,
						stats: this.coordinator.stats,
					});
				}
			} catch (error: unknown) {
				this.coordinator.recordFailure();

				const errorMessage = getErrorMessage(error);
				const errorDetails = isError(error) ? { stack: error.stack } : {};

				logger.error("[EventIngestionService] Flush failed, re-queuing batch", {
					error: errorMessage,
					batchSize: batch.length,
					remainingInBuffer: this.buffer.size,
					...errorDetails,
				});

				this.buffer.requeueBatch(batch);

				throw new DatabaseError("Failed to flush events to database", {
					batchSize: batch.length,
					error: errorMessage,
				});
			}
		} finally {
			this.coordinator.releaseLock();
			this.resetFlushTimer();
		}
	}

	private resetFlushTimer(): void {
		this.coordinator.resetTimer(() => {
			if (this.buffer.size > 0 && this.coordinator.canFlush()) {
				if (process.env.NODE_ENV !== "production") {
					logger.debug(
						"[EventIngestionService] Timer expired, triggering flush",
						{
							bufferSize: this.buffer.size,
						},
					);
				}
				this.scheduleFlush();
			}
		}, this.isShuttingDown);
	}

	async forceFlush(): Promise<void> {
		this.isShuttingDown = true;

		logger.info("[EventIngestionService] Force flush initiated", {
			bufferSize: this.buffer.size,
		});

		this.coordinator.clearTimer();

		while (this.buffer.size > 0) {
			await this.coordinator.waitForCapacity();
			await this.flush();
		}

		await this.coordinator.waitForCompletion();

		logger.info("[EventIngestionService] Force flush completed", {
			totalEventsProcessed: this.buffer.totalProcessed,
			stats: this.coordinator.stats,
		});
	}

	getBufferSize(): number {
		return this.buffer.size;
	}

	getStats(): BufferStats {
		const coordStats = this.coordinator.stats;
		return {
			bufferSize: this.buffer.size,
			activeFlushes: coordStats.activeFlushes,
			maxBufferSize: this.maxBufferSize,
			backpressureThreshold: this.backpressureThreshold,
			maxConcurrentFlushes: this.maxConcurrentFlushes,
			bufferUtilization: this.buffer.getUtilization(),
			totalEventsProcessed: this.buffer.totalProcessed,
			totalFlushes: coordStats.totalFlushes,
			failedFlushes: coordStats.failedFlushes,
		};
	}
}

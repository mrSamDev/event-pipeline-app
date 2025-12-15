import { EventRepository, NormalizedEvent } from '../repositories/event.repository';

/**
 * Event Ingestion Service
 *
 * Core responsibility: Buffer events in memory and flush to database in batches
 * This optimizes write throughput by reducing database round trips
 *
 * Key features:
 * - Dual-trigger flushing: Size (500 events) OR Time (1000ms)
 * - Mutex pattern prevents overlapping flushes (data integrity)
 * - Emergency threshold prevents OOM (drops events at 5000)
 * - Failed batches are re-queued (don't lose data)
 * - Graceful shutdown support (forceFlush method)
 */
export class EventIngestionService {
  // In-memory buffer for events awaiting persistence
  private buffer: NormalizedEvent[] = [];

  // Timer for time-based flush trigger
  private flushTimer: NodeJS.Timeout | null = null;

  // Mutex flag to prevent concurrent flushes
  // Critical: prevents race conditions where multiple flushes try to write same events
  private isFlushingInProgress = false;

  // Configuration constants
  // These values are tuned for 1M events/day with reasonable memory usage
  private readonly maxBufferSize = 500;          // Flush when buffer reaches this size
  private readonly flushIntervalMs = 1000;       // Flush after this time if buffer not full
  private readonly emergencyThreshold = 5000;    // Drop events beyond this (prevent OOM)

  constructor(private repository: EventRepository) {
    console.log('[EventIngestionService] Initialized with config:', {
      maxBufferSize: this.maxBufferSize,
      flushIntervalMs: this.flushIntervalMs,
      emergencyThreshold: this.emergencyThreshold,
    });
  }

  /**
   * Add an event to the buffer
   * This is the main entry point from the controller
   *
   * @param event - Normalized event to buffer
   *
   * Behavior:
   * - Checks emergency threshold (drops event if buffer too large)
   * - Adds event to buffer
   * - Triggers size-based flush if buffer >= maxBufferSize
   * - Resets timer for time-based flush
   */
  async addEvent(event: NormalizedEvent): Promise<void> {
    // Emergency threshold check: prevent memory exhaustion
    // At 5000 events × 2KB avg = 10MB buffer, we start dropping events
    // This protects the service from OOM but should trigger alerts in production
    if (this.buffer.length >= this.emergencyThreshold) {
      console.warn('[EventIngestionService] EMERGENCY: Buffer overflow, dropping event', {
        bufferSize: this.buffer.length,
        droppedEventId: event.eventId,
        userId: event.userId,
      });
      // Drop event to prevent memory exhaustion
      // In production, this should trigger an alert (buffer backpressure)
      return;
    }

    // Add event to buffer
    this.buffer.push(event);

    // Log buffer growth for monitoring
    if (this.buffer.length % 100 === 0) {
      console.log('[EventIngestionService] Buffer size:', this.buffer.length);
    }

    // Size-based flush trigger: buffer reached max size
    // Only flush if no flush is already in progress (mutex pattern)
    if (this.buffer.length >= this.maxBufferSize && !this.isFlushingInProgress) {
      console.log('[EventIngestionService] Size threshold reached, triggering flush');
      // Don't await - flush asynchronously to keep addEvent fast
      this.flush().catch((error) => {
        console.error('[EventIngestionService] Background flush failed:', error);
      });
    }

    // Reset time-based flush timer
    // This ensures events are flushed even if buffer never fills
    // Example: 50 events in 10 seconds -> will flush after 1 second each time
    this.resetFlushTimer();
  }

  /**
   * Flush buffer to database
   * Private method - only called internally by triggers
   *
   * Critical behaviors:
   * - Mutex pattern: only one flush at a time (isFlushingInProgress flag)
   * - Atomic batch extraction: splice() removes events from buffer before flush
   * - Error handling: failed batches are re-queued to front of buffer
   * - Timer reset: ensures continuous time-based flushing
   */
  private async flush(): Promise<void> {
    // Mutex check: prevent concurrent flushes
    // This is critical for data integrity - we don't want two flushes writing the same events
    if (this.isFlushingInProgress) {
      console.log('[EventIngestionService] Flush already in progress, skipping');
      return;
    }

    // Empty buffer check
    if (this.buffer.length === 0) {
      return;
    }

    // Acquire mutex lock
    this.isFlushingInProgress = true;

    // Atomically extract batch from buffer
    // splice() modifies buffer in-place, removing first N events
    // This prevents race conditions where new events arrive during flush
    const batch = this.buffer.splice(0, this.maxBufferSize);

    const flushStartTime = Date.now();

    try {
      // Persist batch to database
      await this.repository.bulkInsert(batch);

      const flushDuration = Date.now() - flushStartTime;

      console.log('[EventIngestionService] Flush successful:', {
        batchSize: batch.length,
        durationMs: flushDuration,
        remainingInBuffer: this.buffer.length,
      });

    } catch (error: any) {
      // Flush failed - this is critical, we don't want to lose events
      console.error('[EventIngestionService] Flush failed, re-queuing batch:', {
        error: error.message,
        batchSize: batch.length,
      });

      // Re-queue batch to front of buffer (preserve FIFO order)
      // This ensures events are not lost on transient failures
      // Note: If database is permanently down, buffer will eventually hit emergency threshold
      this.buffer.unshift(...batch);

      // In production, consider:
      // - Exponential backoff before retry
      // - Dead letter queue for events failing after N retries
      // - Circuit breaker pattern to stop accepting events if DB is down

    } finally {
      // Release mutex lock
      this.isFlushingInProgress = false;

      // Reset timer to ensure continuous flushing
      // If buffer still has events, they'll be flushed after flushIntervalMs
      this.resetFlushTimer();
    }
  }

  /**
   * Reset the time-based flush timer
   * Called after every event add and after every flush
   *
   * This implements a debounced timer pattern:
   * - Timer is cleared on every call
   * - New timer is set for flushIntervalMs in the future
   * - Ensures events are flushed within flushIntervalMs of arrival
   */
  private resetFlushTimer(): void {
    // Clear existing timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Set new timer
    this.flushTimer = setTimeout(() => {
      // Only flush if buffer has events and no flush in progress
      if (this.buffer.length > 0 && !this.isFlushingInProgress) {
        console.log('[EventIngestionService] Timer expired, triggering flush');
        this.flush().catch((error) => {
          console.error('[EventIngestionService] Timer-triggered flush failed:', error);
        });
      }
    }, this.flushIntervalMs);
  }

  /**
   * Force flush all buffered events
   * Used during graceful shutdown to ensure no events are lost
   *
   * @returns Promise<void> - Resolves when buffer is empty
   *
   * This method blocks until the buffer is completely empty
   * It's called by the shutdown handler before process exit
   */
  async forceFlush(): Promise<void> {
    console.log('[EventIngestionService] Force flush initiated, buffer size:', this.buffer.length);

    // Clear timer (no more time-based flushes during shutdown)
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush until buffer is empty
    // We loop because buffer may be larger than maxBufferSize
    while (this.buffer.length > 0) {
      // Wait for any in-progress flush to complete
      while (this.isFlushingInProgress) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Flush next batch
      await this.flush();
    }

    console.log('[EventIngestionService] Force flush completed, buffer empty');
  }

  /**
   * Get current buffer size
   * Used by health check endpoint for monitoring
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Get buffer statistics
   * Useful for monitoring and debugging
   */
  getStats() {
    return {
      bufferSize: this.buffer.length,
      isFlushingInProgress: this.isFlushingInProgress,
      maxBufferSize: this.maxBufferSize,
      emergencyThreshold: this.emergencyThreshold,
      bufferUtilization: (this.buffer.length / this.maxBufferSize) * 100,
    };
  }
}

import { EventRepository, NormalizedEvent } from '../repositories/event.repository';

export class EventIngestionService {
  private buffer: NormalizedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private activeFlushes = 0;

  private readonly maxBufferSize = 2000;
  private readonly flushIntervalMs = 200;
  private readonly backpressureThreshold = 10000;
  private readonly maxConcurrentFlushes = 5;

  constructor(private repository: EventRepository) {
    console.log('[EventIngestionService] Initialized with config:', {
      maxBufferSize: this.maxBufferSize,
      flushIntervalMs: this.flushIntervalMs,
      backpressureThreshold: this.backpressureThreshold,
      maxConcurrentFlushes: this.maxConcurrentFlushes,
    });
  }

  canAcceptEvent(): boolean {
    return this.buffer.length < this.backpressureThreshold;
  }

  async addEvent(event: NormalizedEvent): Promise<void> {
    this.buffer.push(event);

    // Reduce logging frequency for better performance
    if (this.buffer.length % 2000 === 0 && process.env.NODE_ENV !== 'production') {
      console.log('[EventIngestionService] Buffer size:', this.buffer.length);
    }

    if (this.buffer.length >= this.maxBufferSize && this.activeFlushes < this.maxConcurrentFlushes) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[EventIngestionService] Size threshold reached, triggering flush');
      }
      this.flush().catch((error) => {
        console.error('[EventIngestionService] Background flush failed:', error);
      });
    }

    this.resetFlushTimer();
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    if (this.activeFlushes >= this.maxConcurrentFlushes) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[EventIngestionService] Max concurrent flushes reached, skipping');
      }
      return;
    }

    this.activeFlushes++;

    const batch = this.buffer.splice(0, this.maxBufferSize);
    const flushStartTime = Date.now();

    try {
      await this.repository.bulkInsert(batch);

      const flushDuration = Date.now() - flushStartTime;

      if (process.env.NODE_ENV !== 'production') {
        console.log('[EventIngestionService] Flush successful:', {
          batchSize: batch.length,
          durationMs: flushDuration,
          remainingInBuffer: this.buffer.length,
          activeFlushes: this.activeFlushes,
        });
      }

    } catch (error: any) {
      console.error('[EventIngestionService] Flush failed, re-queuing batch:', {
        error: error.message,
        batchSize: batch.length,
      });

      this.buffer.unshift(...batch);

    } finally {
      this.activeFlushes--;
      this.resetFlushTimer();
    }
  }

  private resetFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      if (this.buffer.length > 0 && this.activeFlushes < this.maxConcurrentFlushes) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[EventIngestionService] Timer expired, triggering flush');
        }
        this.flush().catch((error) => {
          console.error('[EventIngestionService] Timer-triggered flush failed:', error);
        });
      }
    }, this.flushIntervalMs);
  }

  async forceFlush(): Promise<void> {
    console.log('[EventIngestionService] Force flush initiated, buffer size:', this.buffer.length);

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    while (this.buffer.length > 0) {
      while (this.activeFlushes >= this.maxConcurrentFlushes) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await this.flush();
    }

    console.log('[EventIngestionService] Force flush completed, buffer empty');
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  getStats() {
    return {
      bufferSize: this.buffer.length,
      activeFlushes: this.activeFlushes,
      maxBufferSize: this.maxBufferSize,
      backpressureThreshold: this.backpressureThreshold,
      maxConcurrentFlushes: this.maxConcurrentFlushes,
      bufferUtilization: (this.buffer.length / this.backpressureThreshold) * 100,
    };
  }
}

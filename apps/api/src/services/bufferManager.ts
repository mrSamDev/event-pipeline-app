import type { NormalizedEvent } from "../repositories/event.repository";

export class BufferManager {
	private buffer: NormalizedEvent[] = [];
	private readonly maxBufferSize: number;
	private readonly backpressureThreshold: number;
	private totalEventsProcessed = 0;

	constructor(maxBufferSize: number, backpressureThreshold: number) {
		this.maxBufferSize = maxBufferSize;
		this.backpressureThreshold = backpressureThreshold;
	}

	add(event: NormalizedEvent): void {
		this.buffer.push(event);
		this.totalEventsProcessed++;
	}

	extractBatch(): NormalizedEvent[] {
		const batchSize = Math.min(this.maxBufferSize, this.buffer.length);
		return this.buffer.splice(0, batchSize);
	}

	requeueBatch(batch: NormalizedEvent[]): void {
		this.buffer.unshift(...batch);
	}

	get size(): number {
		return this.buffer.length;
	}

	get totalProcessed(): number {
		return this.totalEventsProcessed;
	}

	get isOverThreshold(): boolean {
		return this.buffer.length >= this.maxBufferSize;
	}

	canAcceptEvents(isShuttingDown: boolean): boolean {
		return !isShuttingDown && this.buffer.length < this.backpressureThreshold;
	}

	getUtilization(): number {
		return (this.buffer.length / this.backpressureThreshold) * 100;
	}
}

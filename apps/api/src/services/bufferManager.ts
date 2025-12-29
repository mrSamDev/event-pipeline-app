import type { NormalizedEvent } from "../repositories/event.repository";

export class BufferManager {
	private buffer: ReadonlyArray<NormalizedEvent> = [];
	private readonly maxBufferSize: number;
	private readonly backpressureThreshold: number;
	private totalEventsProcessed = 0;

	constructor(maxBufferSize: number, backpressureThreshold: number) {
		this.maxBufferSize = maxBufferSize;
		this.backpressureThreshold = backpressureThreshold;
	}

	add(event: NormalizedEvent): void {
		this.buffer = [...this.buffer, event];
		this.totalEventsProcessed++;
	}

	extractBatch(): NormalizedEvent[] {
		const batchSize = Math.min(this.maxBufferSize, this.buffer.length);
		const batch = this.buffer.slice(0, batchSize);
		this.buffer = this.buffer.slice(batchSize);
		return Array.from(batch);
	}

	requeueBatch(batch: NormalizedEvent[]): void {
		this.buffer = [...batch, ...this.buffer];
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

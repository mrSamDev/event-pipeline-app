import { EventEmitter } from "node:events";

export class FlushCoordinator extends EventEmitter {
	private flushTimer: NodeJS.Timeout | null = null;
	private activeFlushes = 0;
	private flushLock = false;
	private totalFlushes = 0;
	private failedFlushes = 0;
	private readonly maxConcurrentFlushes: number;
	private readonly flushIntervalMs: number;

	constructor(maxConcurrentFlushes: number, flushIntervalMs: number) {
		super();
		this.maxConcurrentFlushes = maxConcurrentFlushes;
		this.flushIntervalMs = flushIntervalMs;
	}

	canFlush(): boolean {
		return !this.flushLock && this.activeFlushes < this.maxConcurrentFlushes;
	}

	acquireLock(): boolean {
		if (this.flushLock) {
			return false;
		}
		this.flushLock = true;
		this.activeFlushes++;
		return true;
	}

	releaseLock(): void {
		this.activeFlushes--;
		this.flushLock = false;
		this.emit("capacity-available");
		if (this.activeFlushes === 0) {
			this.emit("all-complete");
		}
	}

	recordSuccess(): void {
		this.totalFlushes++;
	}

	recordFailure(): void {
		this.failedFlushes++;
	}

	resetTimer(callback: () => void, isShuttingDown: boolean): void {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
		}

		if (isShuttingDown) {
			return;
		}

		this.flushTimer = setTimeout(callback, this.flushIntervalMs);
	}

	clearTimer(): void {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
	}

	async waitForCapacity(): Promise<void> {
		if (this.activeFlushes < this.maxConcurrentFlushes) {
			return;
		}
		await new Promise<void>((resolve) => {
			this.once("capacity-available", resolve);
		});
	}

	async waitForCompletion(): Promise<void> {
		if (this.activeFlushes === 0) {
			return;
		}
		await new Promise<void>((resolve) => {
			this.once("all-complete", resolve);
		});
	}

	get stats() {
		return {
			activeFlushes: this.activeFlushes,
			totalFlushes: this.totalFlushes,
			failedFlushes: this.failedFlushes,
		};
	}
}

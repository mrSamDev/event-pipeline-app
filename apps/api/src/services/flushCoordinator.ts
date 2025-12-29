export class FlushCoordinator {
	private flushTimer: NodeJS.Timeout | null = null;
	private activeFlushes = 0;
	private flushLock = false;
	private totalFlushes = 0;
	private failedFlushes = 0;
	private readonly maxConcurrentFlushes: number;
	private readonly flushIntervalMs: number;

	constructor(maxConcurrentFlushes: number, flushIntervalMs: number) {
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
		while (this.activeFlushes >= this.maxConcurrentFlushes) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	async waitForCompletion(): Promise<void> {
		while (this.activeFlushes > 0) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	get stats() {
		return {
			activeFlushes: this.activeFlushes,
			totalFlushes: this.totalFlushes,
			failedFlushes: this.failedFlushes,
		};
	}
}

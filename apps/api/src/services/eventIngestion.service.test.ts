import { EventType } from "@martech/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	EventRepository,
	NormalizedEvent,
} from "../repositories/event.repository";
import { EventIngestionService } from "./eventIngestion.service";

describe("EventIngestionService", () => {
	let service: EventIngestionService;
	let mockRepository: EventRepository;

	const createMockEvent = (
		overrides?: Partial<NormalizedEvent>,
	): NormalizedEvent => ({
		eventId: "event123",
		userId: "user123",
		sessionId: "session456",
		type: EventType.PAGE_VIEW,
		payload: {},
		occurredAt: new Date(),
		receivedAt: new Date(),
		...overrides,
	});

	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		mockRepository = {
			bulkInsert: vi.fn().mockResolvedValue(undefined),
			getUserJourney: vi.fn(),
			getAnalyticsStats: vi.fn(),
			getUserMetrics: vi.fn(),
		} as any;

		service = new EventIngestionService(mockRepository);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("accepts event when buffer has capacity", () => {
		expect(service.canAcceptEvent()).toBe(true);
	});

	it("rejects event when buffer reaches backpressure threshold", async () => {
		mockRepository.bulkInsert = vi.fn().mockRejectedValue(new Error("DB down"));

		const events = Array.from({ length: 10001 }, () => createMockEvent());

		for (const event of events) {
			await service.addEvent(event);
		}

		await vi.advanceTimersByTimeAsync(300);

		expect(service.canAcceptEvent()).toBe(false);
		expect(service.getBufferSize()).toBeGreaterThanOrEqual(10000);
	});

	it("adds event to buffer", async () => {
		const event = createMockEvent();
		await service.addEvent(event);

		expect(service.getBufferSize()).toBe(1);
	});

	it("flushes when buffer reaches max size", async () => {
		const events = Array.from({ length: 2000 }, () => createMockEvent());

		for (const event of events) {
			await service.addEvent(event);
		}

		await vi.runAllTimersAsync();

		expect(mockRepository.bulkInsert).toHaveBeenCalled();
	});

	it("flushes on timer interval", async () => {
		const event = createMockEvent();
		await service.addEvent(event);

		await vi.advanceTimersByTimeAsync(200);

		expect(mockRepository.bulkInsert).toHaveBeenCalledWith([event]);
		expect(service.getBufferSize()).toBe(0);
	});

	it("requeues batch on flush failure", async () => {
		mockRepository.bulkInsert = vi
			.fn()
			.mockRejectedValue(new Error("DB error"));

		const event = createMockEvent();
		await service.addEvent(event);

		await vi.advanceTimersByTimeAsync(200);

		expect(service.getBufferSize()).toBeGreaterThan(0);
	});

	it("force flush empties entire buffer", async () => {
		const events = Array.from({ length: 50 }, () => createMockEvent());

		for (const event of events) {
			await service.addEvent(event);
		}

		await service.forceFlush();

		expect(service.getBufferSize()).toBe(0);
		expect(mockRepository.bulkInsert).toHaveBeenCalled();
	});

	it("limits concurrent flushes", async () => {
		mockRepository.bulkInsert = vi
			.fn()
			.mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 1000)),
			);

		const events = Array.from({ length: 8000 }, () => createMockEvent());

		for (const event of events) {
			await service.addEvent(event);
		}

		expect(service.getStats().activeFlushes).toBeLessThanOrEqual(3);
	});

	it("returns correct stats", async () => {
		const events = Array.from({ length: 100 }, () => createMockEvent());

		for (const event of events) {
			await service.addEvent(event);
		}

		const stats = service.getStats();

		expect(stats.bufferSize).toBe(100);
		expect(stats.maxBufferSize).toBe(2000);
		expect(stats.backpressureThreshold).toBe(10000);
		expect(stats.maxConcurrentFlushes).toBe(3);
		expect(stats.bufferUtilization).toBe(1);
	});
});

import { EventType } from "@martech/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeEvent } from "./eventNormalizer";

describe("normalizeEvent", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
	});

	it("handles Date object as occurredAt", () => {
		const occurredDate = new Date("2025-01-15T10:30:00Z");
		const validatedEvent = {
			eventId: "550e8400-e29b-41d4-a716-446655440000",
			userId: "user123",
			sessionId: "session456",
			type: EventType.PAGE_VIEW,
			payload: { url: "/home" },
			occurredAt: occurredDate,
		};

		const normalized = normalizeEvent(validatedEvent);

		expect(normalized.occurredAt).toBeInstanceOf(Date);
		expect(normalized.occurredAt.getTime()).toBe(occurredDate.getTime());
		expect(normalized.receivedAt).toEqual(new Date("2025-01-15T12:00:00Z"));
		expect(normalized.eventId).toBe("550e8400-e29b-41d4-a716-446655440000");
	});
});

import { EventType } from "@martech/types";
import { describe, expect, it } from "vitest";
import {
	validateDateParam,
	validateLimitParam,
	validateRawEvent,
} from "./event.validator";

describe("validateRawEvent", () => {
	it("accepts valid event", () => {
		const validEvent = {
			eventId: "550e8400-e29b-41d4-a716-446655440000",
			userId: "user123",
			sessionId: "session456",
			type: EventType.PAGE_VIEW,
			payload: { url: "/home" },
			occurredAt: new Date().toISOString(),
		};

		const result = validateRawEvent(validEvent);
		expect(result).toBeDefined();
		expect(result.userId).toBe("user123");
		expect(result.sessionId).toBe("session456");
		expect(result.type).toBe(EventType.PAGE_VIEW);
		expect(result.eventId).toBe("550e8400-e29b-41d4-a716-446655440000");
	});

	it("rejects missing userId", () => {
		const invalidEvent = {
			eventId: "550e8400-e29b-41d4-a716-446655440000",
			sessionId: "session456",
			type: EventType.PAGE_VIEW,
		};

		expect(() => validateRawEvent(invalidEvent)).toThrow(
			"Missing or invalid required field: userId",
		);
	});

	it("rejects invalid userId type", () => {
		const invalidEvent = {
			eventId: "550e8400-e29b-41d4-a716-446655440000",
			userId: 123,
			sessionId: "session456",
			type: EventType.PAGE_VIEW,
		};

		expect(() => validateRawEvent(invalidEvent)).toThrow(
			"Missing or invalid required field: userId",
		);
	});

	it("rejects missing sessionId", () => {
		const invalidEvent = {
			eventId: "550e8400-e29b-41d4-a716-446655440000",
			userId: "user123",
			type: EventType.PAGE_VIEW,
		};

		expect(() => validateRawEvent(invalidEvent)).toThrow(
			"Missing or invalid required field: sessionId",
		);
	});

	it("rejects invalid sessionId type", () => {
		const invalidEvent = {
			eventId: "550e8400-e29b-41d4-a716-446655440000",
			userId: "user123",
			sessionId: 456,
			type: EventType.PAGE_VIEW,
		};

		expect(() => validateRawEvent(invalidEvent)).toThrow(
			"Missing or invalid required field: sessionId",
		);
	});

	it("rejects missing type", () => {
		const invalidEvent = {
			eventId: "550e8400-e29b-41d4-a716-446655440000",
			userId: "user123",
			sessionId: "session456",
		};

		expect(() => validateRawEvent(invalidEvent)).toThrow("Invalid event type");
	});

	it("rejects invalid type value", () => {
		const invalidEvent = {
			eventId: "550e8400-e29b-41d4-a716-446655440000",
			userId: "user123",
			sessionId: "session456",
			type: "INVALID_EVENT_TYPE",
		};

		expect(() => validateRawEvent(invalidEvent)).toThrow("Invalid event type");
	});

	it("rejects invalid eventId format", () => {
		const invalidEvent = {
			eventId: "not-a-uuid",
			userId: "user123",
			sessionId: "session456",
			type: EventType.PAGE_VIEW,
		};

		expect(() => validateRawEvent(invalidEvent)).toThrow(
			"Missing or invalid required field: eventId",
		);
	});
});

describe("validateDateParam", () => {
	it("validates correct ISO date string", () => {
		const dateStr = "2025-01-15T10:30:00Z";
		const result = validateDateParam(dateStr);
		expect(result).toBeInstanceOf(Date);
		expect(result.toISOString()).toBe("2025-01-15T10:30:00.000Z");
	});

	it("validates Date object", () => {
		const date = new Date("2025-01-15T10:30:00Z");
		const result = validateDateParam(date);
		expect(result).toBeInstanceOf(Date);
		expect(result.getTime()).toBe(date.getTime());
	});

	it("rejects invalid date string", () => {
		expect(() => validateDateParam("not-a-date")).toThrow(
			"Invalid date parameter",
		);
	});

	it("rejects empty string", () => {
		expect(() => validateDateParam("")).toThrow("Invalid date parameter");
	});
});

describe("validateLimitParam", () => {
	it("accepts valid limit", () => {
		expect(validateLimitParam("10")).toBe(10);
		expect(validateLimitParam("1")).toBe(1);
		expect(validateLimitParam("1000")).toBe(1000);
		expect(validateLimitParam("500")).toBe(500);
	});

	it("accepts numeric limit", () => {
		expect(validateLimitParam(10)).toBe(10);
		expect(validateLimitParam(1)).toBe(1);
		expect(validateLimitParam(1000)).toBe(1000);
	});

	it("rejects limit below 1", () => {
		expect(() => validateLimitParam("0")).toThrow("Invalid limit parameter");
		expect(() => validateLimitParam("-1")).toThrow("Invalid limit parameter");
	});

	it("rejects limit above 1000", () => {
		expect(() => validateLimitParam("1001")).toThrow("Invalid limit parameter");
		expect(() => validateLimitParam("5000")).toThrow("Invalid limit parameter");
	});

	it("rejects non-numeric values", () => {
		expect(() => validateLimitParam("abc")).toThrow("Invalid limit parameter");
	});

	it("rejects empty string", () => {
		expect(() => validateLimitParam("")).toThrow("Invalid limit parameter");
	});
});

import { EventType } from "@martech/types";
import { describe, expect, it } from "vitest";
import {
	validateDate,
	validateLimit,
	validateRawEvent,
} from "./event.validator";

describe("validateRawEvent", () => {
	it("accepts valid event", () => {
		const validEvent = {
			userId: "user123",
			sessionId: "session456",
			type: EventType.PAGE_VIEW,
			payload: { url: "/home" },
			occurredAt: new Date().toISOString(),
		};

		const result = validateRawEvent(validEvent);
		expect(result).toBeNull();
	});

	it("rejects missing userId", () => {
		const invalidEvent = {
			sessionId: "session456",
			type: EventType.PAGE_VIEW,
		} as any;

		const result = validateRawEvent(invalidEvent);
		expect(result).toEqual({
			error: "Bad Request",
			message: "Missing or invalid required field: userId",
		});
	});

	it("rejects invalid userId type", () => {
		const invalidEvent = {
			userId: 123,
			sessionId: "session456",
			type: EventType.PAGE_VIEW,
		} as any;

		const result = validateRawEvent(invalidEvent);
		expect(result).toEqual({
			error: "Bad Request",
			message: "Missing or invalid required field: userId",
		});
	});

	it("rejects missing sessionId", () => {
		const invalidEvent = {
			userId: "user123",
			type: EventType.PAGE_VIEW,
		} as any;

		const result = validateRawEvent(invalidEvent);
		expect(result).toEqual({
			error: "Bad Request",
			message: "Missing or invalid required field: sessionId",
		});
	});

	it("rejects invalid sessionId type", () => {
		const invalidEvent = {
			userId: "user123",
			sessionId: 456,
			type: EventType.PAGE_VIEW,
		} as any;

		const result = validateRawEvent(invalidEvent);
		expect(result).toEqual({
			error: "Bad Request",
			message: "Missing or invalid required field: sessionId",
		});
	});

	it("rejects missing type", () => {
		const invalidEvent = {
			userId: "user123",
			sessionId: "session456",
		} as any;

		const result = validateRawEvent(invalidEvent);
		expect(result).toEqual({
			error: "Bad Request",
			message: "Missing or invalid required field: type",
		});
	});

	it("rejects invalid type value", () => {
		const invalidEvent = {
			userId: "user123",
			sessionId: "session456",
			type: "INVALID_EVENT_TYPE",
		};

		const result = validateRawEvent(invalidEvent);
		expect(result?.error).toBe("Bad Request");
		expect(result?.message).toContain("Invalid event type");
	});
});

describe("validateDate", () => {
	it("validates correct ISO date string", () => {
		const dateStr = "2025-01-15T10:30:00Z";
		const result = validateDate(dateStr);
		expect(result).toBeInstanceOf(Date);
		expect(result?.toISOString()).toBe("2025-01-15T10:30:00.000Z");
	});

	it("validates Date object", () => {
		const date = new Date("2025-01-15T10:30:00Z");
		const result = validateDate(date);
		expect(result).toBeInstanceOf(Date);
		expect(result?.getTime()).toBe(date.getTime());
	});

	it("rejects invalid date string", () => {
		const result = validateDate("not-a-date");
		expect(result).toBeNull();
	});

	it("rejects empty string", () => {
		const result = validateDate("");
		expect(result).toBeNull();
	});
});

describe("validateLimit", () => {
	it("accepts valid limit", () => {
		expect(validateLimit("10")).toBe(10);
		expect(validateLimit("1")).toBe(1);
		expect(validateLimit("1000")).toBe(1000);
		expect(validateLimit("500")).toBe(500);
	});

	it("rejects limit below 1", () => {
		expect(validateLimit("0")).toBeNull();
		expect(validateLimit("-1")).toBeNull();
	});

	it("rejects limit above 1000", () => {
		expect(validateLimit("1001")).toBeNull();
		expect(validateLimit("5000")).toBeNull();
	});

	it("rejects non-numeric values", () => {
		expect(validateLimit("abc")).toBeNull();
	});

	it("rejects empty string", () => {
		expect(validateLimit("")).toBeNull();
	});
});

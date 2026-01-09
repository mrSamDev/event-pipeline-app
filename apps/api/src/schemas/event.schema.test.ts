import { EventType } from "@martech/types";
import { describe, expect, it } from "vitest";
import { validateEventPayload } from "./event.schema";

describe("validateEventPayload - permissive validation", () => {
	it("preserves extra fields in PAGE_VIEW payload", () => {
		const payload = {
			url: "/home",
			title: "Home Page",
			customField: "custom value",
			userAgent: "Mozilla/5.0",
			deviceId: "device-123",
		};

		const result = validateEventPayload(EventType.PAGE_VIEW, payload);

		expect(result.url).toBe("/home");
		expect(result.title).toBe("Home Page");
		expect((result as any).customField).toBe("custom value");
		expect((result as any).userAgent).toBe("Mozilla/5.0");
		expect((result as any).deviceId).toBe("device-123");
	});

	it("preserves extra fields in PURCHASE payload", () => {
		const payload = {
			orderId: "order-123",
			revenue: 99.99,
			currency: "USD",
			items: [
				{
					productId: "prod-1",
					name: "Product 1",
					quantity: 2,
					price: 49.99,
				},
			],
			customerId: "cust-456",
			affiliateId: "aff-789",
			campaignId: "camp-012",
		};

		const result = validateEventPayload(EventType.PURCHASE, payload);

		expect(result.orderId).toBe("order-123");
		expect(result.revenue).toBe(99.99);
		expect((result as any).customerId).toBe("cust-456");
		expect((result as any).affiliateId).toBe("aff-789");
		expect((result as any).campaignId).toBe("camp-012");
	});

	it("preserves extra fields in BUTTON_CLICK payload", () => {
		const payload = {
			buttonId: "btn-submit",
			buttonText: "Submit Form",
			pageUrl: "/checkout",
			experimentId: "exp-123",
			variantId: "var-A",
		};

		const result = validateEventPayload(EventType.BUTTON_CLICK, payload);

		expect(result.buttonId).toBe("btn-submit");
		expect(result.buttonText).toBe("Submit Form");
		expect((result as any).pageUrl).toBe("/checkout");
		expect((result as any).experimentId).toBe("exp-123");
		expect((result as any).variantId).toBe("var-A");
	});

	it("validates required fields but keeps extras", () => {
		const payload = {
			query: "laptop",
			extraMetadata: {
				category: "electronics",
				filters: ["brand", "price"],
			},
		};

		const result = validateEventPayload(EventType.SEARCH, payload);

		expect(result.query).toBe("laptop");
		expect((result as any).extraMetadata).toEqual({
			category: "electronics",
			filters: ["brand", "price"],
		});
	});

	it("still validates required fields", () => {
		const payloadMissingUrl = {
			title: "Home Page",
			customField: "custom value",
		};

		expect(() =>
			validateEventPayload(EventType.PAGE_VIEW, payloadMissingUrl),
		).toThrow("PageView requires url string");
	});

	it("still validates field types", () => {
		const payloadInvalidType = {
			url: 123,
			customField: "custom value",
		};

		expect(() =>
			validateEventPayload(EventType.PAGE_VIEW, payloadInvalidType),
		).toThrow("PageView requires url string");
	});
});

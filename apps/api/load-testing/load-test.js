import { check, sleep } from "k6";
import http from "k6/http";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

const EVENT_TYPES = [
	"session_start",
	"page_view",
	"search",
	"purchase",
	"add_to_cart",
	"remove_from_cart",
	"button_click",
	"form_submit",
	"video_play",
	"video_pause",
];

function generateEventId() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function generateUserId() {
	return `user_${Math.floor(Math.random() * 1000000)}`;
}

function generateSessionId() {
	return `session_${Math.floor(Math.random() * 100000)}`;
}

function generatePayload(eventType) {
	const basePayload = {
		userAgent: "LoadTest/1.0",
		ip: "127.0.0.1",
	};

	switch (eventType) {
		case "page_view":
			return {
				...basePayload,
				url: `/page/${Math.floor(Math.random() * 100)}`,
				referrer: "/",
			};
		case "search":
			return {
				...basePayload,
				query: `search_term_${Math.floor(Math.random() * 1000)}`,
				results: 42,
			};
		case "purchase":
			return {
				...basePayload,
				amount: Math.floor(Math.random() * 10000) / 100,
				currency: "USD",
				productId: `prod_${Math.floor(Math.random() * 500)}`,
			};
		case "add_to_cart":
			return {
				...basePayload,
				productId: `prod_${Math.floor(Math.random() * 500)}`,
				quantity: Math.floor(Math.random() * 5) + 1,
			};
		case "remove_from_cart":
			return {
				...basePayload,
				productId: `prod_${Math.floor(Math.random() * 500)}`,
			};
		case "button_click":
			return {
				...basePayload,
				buttonId: `btn_${Math.floor(Math.random() * 50)}`,
				label: "Click Me",
			};
		case "form_submit":
			return {
				...basePayload,
				formId: `form_${Math.floor(Math.random() * 20)}`,
				fields: ["email", "name"],
			};
		case "video_play":
			return {
				...basePayload,
				videoId: `video_${Math.floor(Math.random() * 100)}`,
				position: 0,
			};
		case "video_pause":
			return {
				...basePayload,
				videoId: `video_${Math.floor(Math.random() * 100)}`,
				position: Math.floor(Math.random() * 180),
			};
		default:
			return basePayload;
	}
}

function generateEvent() {
	const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
	return {
		eventId: generateEventId(),
		userId: generateUserId(),
		sessionId: generateSessionId(),
		type: eventType,
		payload: generatePayload(eventType),
		occurredAt: new Date().toISOString(),
	};
}

function generateBatch(size) {
	const events = [];
	for (let i = 0; i < size; i++) {
		events.push(generateEvent());
	}
	return events;
}

export const options = {
	scenarios: {
		// Scenario 1: Single event requests at high RPS
		single_events: {
			executor: "constant-arrival-rate",
			rate: 1000000, // 1M RPS for single events
			timeUnit: "1s",
			duration: "60s",
			preAllocatedVUs: 10000,
			maxVUs: 50000,
			exec: "singleEvent",
		},

		// Scenario 2: Batch event requests
		batch_events: {
			executor: "constant-arrival-rate",
			rate: 100000, // 100K RPS with batch size of 10 = 1M events/s
			timeUnit: "1s",
			duration: "60s",
			preAllocatedVUs: 5000,
			maxVUs: 20000,
			exec: "batchEvents",
		},

		// Scenario 3: Large batches for remaining 3M RPS
		large_batch_events: {
			executor: "constant-arrival-rate",
			rate: 30000, // 30K RPS with batch size of 100 = 3M events/s
			timeUnit: "1s",
			duration: "60s",
			preAllocatedVUs: 5000,
			maxVUs: 20000,
			exec: "largeBatchEvents",
		},
	},

	thresholds: {
		http_req_duration: ["p(95)<500", "p(99)<1000"],
		http_req_failed: ["rate<0.05"], // Less than 5% errors
		errors: ["rate<0.05"],
	},
};

const API_BASE_URL = __ENV.API_URL || "http://localhost:3000";

export function singleEvent() {
	const event = generateEvent();

	const params = {
		headers: {
			"Content-Type": "application/json",
		},
		timeout: "10s",
	};

	const response = http.post(
		`${API_BASE_URL}/events`,
		JSON.stringify(event),
		params,
	);

	const success = check(response, {
		"status is 202": (r) => r.status === 202,
		"response has eventIds": (r) => {
			try {
				const body = JSON.parse(r.body);
				return Array.isArray(body.eventIds) && body.eventIds.length > 0;
			} catch {
				return false;
			}
		},
	});

	errorRate.add(!success);
}

export function batchEvents() {
	const batch = generateBatch(10);

	const params = {
		headers: {
			"Content-Type": "application/json",
		},
		timeout: "10s",
	};

	const response = http.post(
		`${API_BASE_URL}/events`,
		JSON.stringify(batch),
		params,
	);

	const success = check(response, {
		"status is 202": (r) => r.status === 202,
		"response has correct count": (r) => {
			try {
				const body = JSON.parse(r.body);
				return body.count === 10;
			} catch {
				return false;
			}
		},
	});

	errorRate.add(!success);
}

export function largeBatchEvents() {
	const batch = generateBatch(100);

	const params = {
		headers: {
			"Content-Type": "application/json",
		},
		timeout: "15s",
	};

	const response = http.post(
		`${API_BASE_URL}/events`,
		JSON.stringify(batch),
		params,
	);

	const success = check(response, {
		"status is 202": (r) => r.status === 202,
		"response has correct count": (r) => {
			try {
				const body = JSON.parse(r.body);
				return body.count === 100;
			} catch {
				return false;
			}
		},
	});

	errorRate.add(!success);
}

export function handleSummary(data) {
	return {
		"summary.json": JSON.stringify(data, null, 2),
		stdout: textSummary(data, { indent: " ", enableColors: true }),
	};
}

function textSummary(data, options = {}) {
	const indent = options.indent || "";
	const enableColors = options.enableColors || false;

	const metrics = data.metrics;
	const scenarios = data.root_group.groups || {};

	let output = `\n${indent}Load Test Summary\n`;
	output += `${indent}${"=".repeat(50)}\n\n`;

	if (metrics.http_reqs) {
		output += `${indent}HTTP Requests:\n`;
		output += `${indent}  Total: ${metrics.http_reqs.values.count}\n`;
		output += `${indent}  Rate: ${metrics.http_reqs.values.rate.toFixed(2)}/s\n\n`;
	}

	if (metrics.http_req_duration) {
		output += `${indent}Response Time:\n`;
		output += `${indent}  Min: ${metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
		output += `${indent}  Med: ${metrics.http_req_duration.values.med.toFixed(2)}ms\n`;
		output += `${indent}  Avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
		output += `${indent}  P95: ${metrics.http_req_duration.values["p(95)"].toFixed(2)}ms\n`;
		output += `${indent}  P99: ${metrics.http_req_duration.values["p(99)"].toFixed(2)}ms\n`;
		output += `${indent}  Max: ${metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;
	}

	if (metrics.http_req_failed) {
		const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
		output += `${indent}Failed Requests: ${failRate}%\n\n`;
	}

	if (metrics.errors) {
		const errorRate = (metrics.errors.values.rate * 100).toFixed(2);
		output += `${indent}Error Rate: ${errorRate}%\n\n`;
	}

	return output;
}

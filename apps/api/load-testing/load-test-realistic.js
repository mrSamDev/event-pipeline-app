import { check } from "k6";
import http from "k6/http";
import { Rate } from "k6/metrics";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

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

function generatePayload(eventType) {
	switch (eventType) {
		case "session_start":
			return {
				deviceType: "desktop",
				browser: "Chrome",
				os: "macOS",
				screenResolution: "1920x1080",
				timezone: "America/New_York",
				language: "en-US",
			};
		case "page_view":
			return {
				url: `/page/${Math.floor(Math.random() * 100)}`,
				title: `Page ${Math.floor(Math.random() * 100)}`,
				referrer: "/",
			};
		case "search":
			return {
				query: `search_term_${Math.floor(Math.random() * 1000)}`,
				resultsCount: Math.floor(Math.random() * 100),
			};
		case "purchase":
			return {
				orderId: `order_${Math.floor(Math.random() * 1000000)}`,
				revenue: Math.floor(Math.random() * 10000) / 100,
				currency: "USD",
				items: [
					{
						productId: `prod_${Math.floor(Math.random() * 500)}`,
						name: `Product ${Math.floor(Math.random() * 500)}`,
						quantity: Math.floor(Math.random() * 5) + 1,
						price: Math.floor(Math.random() * 10000) / 100,
					},
				],
			};
		case "add_to_cart":
			return {
				productId: `prod_${Math.floor(Math.random() * 500)}`,
				name: `Product ${Math.floor(Math.random() * 500)}`,
				price: Math.floor(Math.random() * 10000) / 100,
				quantity: Math.floor(Math.random() * 5) + 1,
				currency: "USD",
			};
		case "remove_from_cart":
			return {
				productId: `prod_${Math.floor(Math.random() * 500)}`,
				quantity: Math.floor(Math.random() * 5) + 1,
			};
		case "button_click":
			return {
				buttonId: `btn_${Math.floor(Math.random() * 50)}`,
				buttonText: "Click Me",
				elementClass: "button-primary",
			};
		case "form_submit":
			return {
				formId: `form_${Math.floor(Math.random() * 20)}`,
				formName: `Form ${Math.floor(Math.random() * 20)}`,
				fields: { email: "test", name: "test" },
			};
		case "video_play":
			return {
				videoId: `video_${Math.floor(Math.random() * 100)}`,
				videoTitle: `Video ${Math.floor(Math.random() * 100)}`,
				duration: 180,
				currentTime: 0,
			};
		case "video_pause":
			return {
				videoId: `video_${Math.floor(Math.random() * 100)}`,
				currentTime: Math.floor(Math.random() * 180),
				percentWatched: Math.floor(Math.random() * 100),
			};
		default:
			return {};
	}
}

function generateEvent() {
	const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
	return {
		eventId: uuidv4(),
		userId: `user_${Math.floor(Math.random() * 100000)}`,
		sessionId: `session_${Math.floor(Math.random() * 10000)}`,
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
		// Current load: 12 events/sec baseline
		baseline: {
			executor: "constant-arrival-rate",
			rate: 12,
			timeUnit: "1s",
			duration: "60s",
			preAllocatedVUs: 5,
			maxVUs: 20,
			exec: "singleEvent",
			startTime: "0s",
		},

		// Target load (5x): 58 events/sec sustained
		// Using batches for efficiency
		target_load_small_batch: {
			executor: "constant-arrival-rate",
			rate: 6,
			timeUnit: "1s",
			duration: "180s",
			preAllocatedVUs: 10,
			maxVUs: 30,
			exec: "smallBatch",
			startTime: "60s",
		},

		// Spike test: 10x target = 580 events/sec for 30s
		spike_test: {
			executor: "constant-arrival-rate",
			rate: 58,
			timeUnit: "1s",
			duration: "30s",
			preAllocatedVUs: 30,
			maxVUs: 100,
			exec: "smallBatch",
			startTime: "240s",
		},

		// Sustained high load: 20x target = 1160 events/sec for 60s
		sustained_high: {
			executor: "constant-arrival-rate",
			rate: 116,
			timeUnit: "1s",
			duration: "60s",
			preAllocatedVUs: 50,
			maxVUs: 150,
			exec: "smallBatch",
			startTime: "270s",
		},

		// Peak load test: 50x target = 2900 events/sec for 30s
		peak_load: {
			executor: "constant-arrival-rate",
			rate: 290,
			timeUnit: "1s",
			duration: "30s",
			preAllocatedVUs: 100,
			maxVUs: 300,
			exec: "smallBatch",
			startTime: "330s",
		},
	},

	thresholds: {
		http_req_duration: ["p(95)<500", "p(99)<1000"],
		http_req_failed: ["rate<0.01"],
		errors: ["rate<0.01"],
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

export function smallBatch() {
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

export function mediumBatch() {
	const batch = generateBatch(50);

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
				return body.count === 50;
			} catch {
				return false;
			}
		},
	});

	errorRate.add(!success);
}

export function largeBatch() {
	const batch = generateBatch(100);

	const params = {
		headers: {
			"Content-Type": "application/json",
		},
		timeout: "20s",
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
	const metrics = data.metrics;

	let output = `\n${indent}Load Test Summary\n`;
	output += `${indent}${"=".repeat(50)}\n\n`;

	if (metrics.http_reqs?.values) {
		output += `${indent}HTTP Requests:\n`;
		output += `${indent}  Total: ${metrics.http_reqs.values.count || 0}\n`;
		if (metrics.http_reqs.values.rate != null) {
			output += `${indent}  Rate: ${metrics.http_reqs.values.rate.toFixed(2)}/s\n\n`;
		}
	}

	if (metrics.http_req_duration?.values) {
		const values = metrics.http_req_duration.values;
		output += `${indent}Response Time:\n`;
		if (values.min != null)
			output += `${indent}  Min: ${values.min.toFixed(2)}ms\n`;
		if (values.med != null)
			output += `${indent}  Med: ${values.med.toFixed(2)}ms\n`;
		if (values.avg != null)
			output += `${indent}  Avg: ${values.avg.toFixed(2)}ms\n`;
		if (values["p(95)"] != null)
			output += `${indent}  P95: ${values["p(95)"].toFixed(2)}ms\n`;
		if (values["p(99)"] != null)
			output += `${indent}  P99: ${values["p(99)"].toFixed(2)}ms\n`;
		if (values.max != null)
			output += `${indent}  Max: ${values.max.toFixed(2)}ms\n\n`;
	}

	if (
		metrics.http_req_failed?.values &&
		metrics.http_req_failed.values.rate != null
	) {
		const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
		output += `${indent}Failed Requests: ${failRate}%\n\n`;
	}

	if (metrics.errors?.values && metrics.errors.values.rate != null) {
		const errorRate = (metrics.errors.values.rate * 100).toFixed(2);
		output += `${indent}Error Rate: ${errorRate}%\n\n`;
	}

	return output;
}

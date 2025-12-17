import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const EVENT_TYPES = [
  'session_start',
  'page_view',
  'search',
  'purchase',
  'add_to_cart',
  'remove_from_cart',
  'button_click',
  'form_submit',
  'video_play',
  'video_pause',
];

function generateEvent() {
  const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  return {
    userId: `user_${Math.floor(Math.random() * 100000)}`,
    sessionId: `session_${Math.floor(Math.random() * 10000)}`,
    type: eventType,
    payload: { test: true, eventType },
    occurredAt: new Date().toISOString(),
  };
}

export const options = {
  scenarios: {
    load_test: {
      executor: 'constant-arrival-rate',
      rate: 10000, // Start with 10K RPS, scale up gradually
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

const API_BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  const event = generateEvent();

  const response = http.post(
    `${API_BASE_URL}/events`,
    JSON.stringify(event),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    }
  );

  const success = check(response, {
    'status is 202': (r) => r.status === 202,
  });

  errorRate.add(!success);
}

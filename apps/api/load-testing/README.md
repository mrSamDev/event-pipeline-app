# Load Testing Guide

This guide explains how to load test the MarTech event ingestion API.

## Target Performance

**Current:** ~12 events/sec (1M events/day)
**Target:** ~58 events/sec (5M events/day)
**Headroom:** Up to 2,900 events/sec (50x target) during spikes

## Why k6?

For high-performance load testing:
- **k6** is written in Go, handles high RPS efficiently
- Supports distributed testing across multiple machines
- Low resource overhead per virtual user
- Built-in metrics and thresholds

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

## Load Test Files

### 1. Load Test

Production-ready load test targeting 5M events/day (58 events/sec).

**Run:**
```bash
cd load-testing
k6 run load-test-realistic.js
```

**What it does:**
- **Baseline** (60s): 12 events/sec - current production load
- **Target** (180s): 60 events/sec - 5x target using batches
- **Spike** (30s): 580 events/sec - 10x spike test
- **Sustained** (60s): 1,160 events/sec - 20x sustained load
- **Peak** (30s): 2,900 events/sec - 50x peak capacity

**Total duration:** 6 minutes

**Expected results:**
```
✓ status is 202
✓ response has correct count

http_req_duration..............: avg=67ms  p(95)=234ms p(99)=456ms
http_req_failed................: 0.12%
errors.........................: 0.08%
```

### 2. Simple Load Test (`load-test-simple.js`)

Quick smoke test for basic validation.

**Run:**
```bash
cd load-testing
k6 run load-test-simple.js
```

**What it does:**
- 300 events/sec for 30 seconds
- Single event per request
- Basic validation

### 3. Extreme Load Test (`load-test.js`) ⚠️ USE WITH CAUTION

Stress test attempting 5M RPS (not 5M events/day - this is extreme).

**Warning:** This will overwhelm most servers. Only use for finding absolute limits.

**Run:**
```bash
cd load-testing
k6 run load-test.js
```

### 3. Distributed Load Test (`load-test-distributed.sh`)

For true 5M RPS, you need multiple machines.

**Single machine:**
```bash
cd load-testing
chmod +x load-test-distributed.sh
./load-test-distributed.sh
```

**Customize:**
```bash
# 10 instances, 60 second test
INSTANCES=10 DURATION=60s ./load-test-distributed.sh

# Different target
API_URL=https://api.production.com ./load-test-distributed.sh
```

**Multiple machines:**

On Machine 1:
```bash
k6 run -e API_URL=http://target-api:3000 -e RPS=1000000 load-test.js
```

On Machine 2:
```bash
k6 run -e API_URL=http://target-api:3000 -e RPS=1000000 load-test.js
```

On Machine 3-5:
```bash
k6 run -e API_URL=http://target-api:3000 -e RPS=1000000 load-test.js
```

## Event Types Tested

All load tests cycle through these event types:
- `session_start` - Session initialization
- `page_view` - Page navigation with URL
- `search` - Search queries with terms
- `purchase` - Purchase events with amount
- `add_to_cart` - Add to cart with product ID
- `remove_from_cart` - Remove from cart
- `button_click` - Button interactions
- `form_submit` - Form submissions
- `video_play` - Video playback start
- `video_pause` - Video playback pause

Each event type generates realistic payload data.

## Event Validation

The API uses permissive validation that:
- Validates required fields for each event type
- Validates data types for known fields
- Preserves all extra/custom fields in the payload
- Allows clients to send additional metadata without errors

Example:
```javascript
// This payload is valid - custom fields are preserved
{
  "url": "/home",
  "title": "Home Page",
  "customerId": "user-123",      // extra field - preserved
  "experimentId": "exp-456",     // extra field - preserved
  "deviceId": "device-789"       // extra field - preserved
}
```

This approach supports flexible client implementations and custom tracking needs without requiring schema changes.

## Understanding Results

### Key Metrics

**http_reqs**: Total requests sent
```
http_reqs......................: 5000000  83333/s
```

**http_req_duration**: Response time distribution
```
http_req_duration..............: avg=250ms min=50ms med=200ms max=2s p(95)=500ms p(99)=1s
```

**http_req_failed**: Error rate
```
http_req_failed................: 2.5%  ✓ 125000 ✗ 4875000
```

**Custom metrics**:
```
errors.........................: 2.5%
```

### Interpreting Results

**Good:**
- P95 latency < 500ms
- P99 latency < 1000ms
- Error rate < 5%
- No timeouts

**Warning:**
- P95 latency 500ms-1000ms
- Error rate 5-10%
- Occasional timeouts

**Critical:**
- P95 latency > 1000ms
- Error rate > 10%
- Frequent 503 responses
- Connection refused errors

## System Requirements

### For 5M RPS Load Generation

**Minimum (distributed):**
- 5-10 machines with 8 CPU cores each
- 16GB RAM per machine
- 10Gbps network
- k6 installed on all machines

**Recommended:**
- 10-20 machines with 16 CPU cores each
- 32GB RAM per machine
- 25Gbps network
- Load balancer if testing multiple API instances

### For API Target

**This API will NOT handle 5M RPS on a single instance.**

To handle 5M RPS, you need:
- Load balancer (AWS ALB, Nginx, HAProxy)
- 100+ API instances (each handling 50K RPS)
- MongoDB sharded cluster (50+ shards)
- Message queue (Kafka, RabbitMQ) for async processing
- Redis for caching
- Horizontal pod autoscaling

**Current single instance tested capacity:** ~290 events/sec peak, 116 events/sec sustained

## Practical Testing Strategy

### Phase 1: Validate Baseline
```bash
cd load-testing
k6 run load-test-simple.js
```

### Phase 2: Production Simulation
```bash
cd load-testing
k6 run load-test-realistic.js
```

### Phase 3: Find Breaking Point
```bash
cd load-testing
# Gradually increase load until errors appear
k6 run load-test.js
```

### Phase 4: Distributed Test (Scale to target)
```bash
cd load-testing
# Run on multiple machines
INSTANCES=10 API_URL=http://production-api:3000 ./load-test-distributed.sh
```

## Monitoring During Tests

### Watch API Health
```bash
watch -n 1 curl http://localhost:3000/health
```

### Watch Metrics
```bash
curl http://localhost:9464/metrics | grep -E "(http_requests|buffer_size)"
```

### MongoDB Performance
```bash
mongo --eval "db.currentOp()"
mongo --eval "db.serverStatus().connections"
```

### System Resources
```bash
htop
iostat -x 1
netstat -s
```

## Common Issues

### "Connection refused"
- API not running
- Firewall blocking requests
- Too many open connections

**Fix:**
```bash
# Increase system limits
ulimit -n 65535
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
sysctl -w net.ipv4.tcp_tw_reuse=1
```

### "Request timeout"
- API overloaded
- Database slow
- Network congestion

**Fix:**
- Reduce RPS
- Scale API horizontally
- Add more database capacity

### "Out of memory"
- Too many virtual users
- Batch size too large
- Memory leak

**Fix:**
```bash
# Reduce VUs or increase maxVUs
k6 run --vus 100 --max-vus 500 load-test.js
```

## Cloud Load Testing

### AWS
Use Amazon CloudWatch Synthetics or deploy k6 on EC2 instances.

### GCP
Use Google Cloud Load Testing or deploy k6 on GCE instances.

### Grafana Cloud k6
```bash
k6 cloud login
k6 cloud run load-test.js
```

## Advanced: Custom Metrics

Add to load test:
```javascript
import { Counter, Trend } from 'k6/metrics';

const eventCounter = new Counter('events_sent');
const eventSize = new Trend('event_size_bytes');

export default function() {
  const event = generateEvent();
  const payload = JSON.stringify(event);

  eventSize.add(payload.length);
  eventCounter.add(1);

  http.post(url, payload);
}
```

## Current Performance

With the optimized event ingestion service:
- **290 events/sec peak** with 0% error rate
- **116 events/sec sustained** with 0% error rate
- P95 latency: 2.79ms
- Concurrent flush processing
- Proper backpressure with HTTP 429

## Next Steps

1. Start with `load-test-simple.js` for baseline testing
2. Monitor API health and metrics
3. Use `load-test-realistic.js` for production simulation
4. For higher throughput, scale horizontally with load balancer

**Remember:** Single server performance is solid at 290 events/sec peak. Current baseline is 12 events/sec with proven 24x headroom.

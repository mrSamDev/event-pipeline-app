# Event Ingestion Pipeline API

A production-grade, high-volume event ingestion pipeline built with Node.js, Express, TypeScript, and MongoDB. Designed to handle ~1M events/day with scalability to 5M+.

## Architecture

```
POST /events (202) → Normalize → In-Memory Buffer → Batch Flush → MongoDB (append-only)
                                                                           ↓
                                                  GET /users/:userId/journey
```

### Key Features

- **Write-optimized**: Batches 500 events, bulk inserts to minimize DB round trips
- **Read-optimized**: Compound MongoDB indexes for efficient user journey queries
- **Dual-trigger flushing**: Size (500 events) OR Time (1000ms)
- **Graceful degradation**: 202 response, async persistence, buffer overflow protection
- **Production-ready**: Graceful shutdown, structured logging, error handling

## Project Structure

```
src/
├── controllers/
│   ├── auth.controller.ts        # Better Auth endpoints handling
│   └── events.controller.ts      # HTTP request/response handling
├── services/
│   └── eventIngestion.service.ts # Buffer management and dual-trigger flushing
├── repositories/
│   └── event.repository.ts       # MongoDB data access layer
├── models/
│   └── Event.ts                  # Mongoose schema and indexes
├── auth.ts                       # Better Auth configuration
├── routes.ts                     # Route registration and dependency injection
└── index.ts                      # Application bootstrap and graceful shutdown
```

## Setup

### Prerequisites

- Node.js 20+
- pnpm 10.25+ (via Corepack)
- MongoDB 7.0+ (local or MongoDB Atlas)

### Installation

1. Clone the repository and install dependencies:
```bash
pnpm install
```

2. Create `.env` file in `apps/api/` directory:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/martech

# Better Auth (generate a secure secret for production)
BETTER_AUTH_SECRET=change-this-to-a-secure-random-string-in-production
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Local MongoDB Setup (macOS)

```bash
# Install MongoDB
brew install mongodb-community@7.0

# Start MongoDB service
brew services start mongodb-community@7.0

# Verify MongoDB is running
mongosh
```

### MongoDB Atlas Setup (Cloud)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Update `MONGODB_URI` in `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/martech?retryWrites=true&w=majority
```

## Development

### Run in Development Mode

```bash
# From project root
pnpm --filter api dev

# Or from apps/api directory
pnpm dev
```

The server will start on `http://localhost:3000` with auto-reload on file changes.

**Important endpoints:**
- API: `http://localhost:3000`
- Swagger Documentation: `http://localhost:3000/api-docs`
- Health Check: `http://localhost:3000/health`

### Build for Production

```bash
# From project root
pnpm --filter api build

# Or from apps/api directory
pnpm build
```

### Run Production Build

```bash
# From project root
pnpm --filter api start

# Or from apps/api directory
pnpm start
```

## API Documentation

### Interactive Documentation (Swagger UI)

The API includes comprehensive interactive documentation powered by Swagger/OpenAPI:

**Access the documentation at**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

Features:
- **Try it out**: Test all endpoints directly from the browser
- **Request/Response examples**: See sample payloads and responses
- **Schema definitions**: Detailed data models
- **Authentication testing**: Test authenticated endpoints with session cookies

**OpenAPI Spec**: Available at [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

You can import this spec into tools like Postman, Insomnia, or use it to generate client SDKs.

## API Endpoints

### Authentication Endpoints

Better Auth provides comprehensive authentication with email/password, session management, and more.

#### POST /api/auth/sign-up/email

Register a new user with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "name": "John Doe"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "createdAt": "2025-12-15T10:30:00.000Z"
  },
  "session": {
    "token": "session-token",
    "expiresAt": "2025-12-22T10:30:00.000Z"
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123",
    "name": "John Doe"
  }'
```

#### POST /api/auth/sign-in/email

Login with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "token": "session-token",
    "expiresAt": "2025-12-22T10:30:00.000Z"
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

#### POST /api/auth/sign-out

Logout and invalidate session.

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/sign-out \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
```

#### GET /api/auth/get-session

Get current session information.

**Example**:
```bash
curl http://localhost:3000/api/auth/get-session \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
```

#### GET /session

Convenience endpoint to check current session.

**Response** (200 OK if authenticated):
```json
{
  "session": {
    "token": "session-token",
    "userId": "uuid",
    "expiresAt": "2025-12-22T10:30:00.000Z"
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Example**:
```bash
curl http://localhost:3000/session \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
```

#### GET /users

List all users (for testing/admin purposes).

**WARNING**: Protect this endpoint in production.

**Example**:
```bash
curl http://localhost:3000/users
```

### Event Endpoints

### 1. POST /events

Ingest one or more events into the pipeline.

**Request Body** (single event):
```json
{
  "userId": "user123",
  "sessionId": "sess456",
  "type": "page_view",
  "payload": {
    "url": "/products/123",
    "referrer": "https://google.com"
  },
  "occurredAt": "2025-12-15T10:30:00Z"
}
```

**Request Body** (batch):
```json
[
  {
    "userId": "user123",
    "sessionId": "sess456",
    "type": "page_view",
    "payload": { "url": "/home" }
  },
  {
    "userId": "user123",
    "sessionId": "sess456",
    "type": "button_click",
    "payload": { "button": "add_to_cart" }
  }
]
```

**Response** (202 Accepted):
```json
{
  "message": "Events accepted for processing",
  "count": 2,
  "eventIds": ["uuid-1", "uuid-2"]
}
```

**Supported Event Types**:
- `session_start`
- `page_view`
- `search`
- `purchase`
- `add_to_cart`
- `remove_from_cart`
- `button_click`
- `form_submit`
- `video_play`
- `video_pause`

**Example with curl**:
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "sessionId": "sess456",
    "type": "page_view",
    "payload": {"url": "/home"}
  }'
```

### 2. GET /users/:userId/journey

Retrieve a user's event journey with optional filtering.

**Query Parameters**:
- `from` (optional): ISO date string, start of date range
- `to` (optional): ISO date string, end of date range
- `limit` (optional): Number (1-1000), default 100

**Example**:
```bash
curl "http://localhost:3000/users/user123/journey?limit=50"
```

**Response** (200 OK):
```json
{
  "userId": "user123",
  "count": 50,
  "events": [
    {
      "eventId": "uuid-1",
      "userId": "user123",
      "sessionId": "sess456",
      "type": "page_view",
      "payload": {"url": "/home"},
      "occurredAt": "2025-12-15T10:30:00.000Z",
      "receivedAt": "2025-12-15T10:30:01.234Z"
    }
  ]
}
```

### 3. GET /health

Health check endpoint with database status and buffer size.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-12-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 123456789,
    "heapTotal": 98765432,
    "heapUsed": 87654321
  },
  "database": "connected",
  "bufferSize": 150
}
```

### 4. GET /stats

Buffer statistics for monitoring.

**Response** (200 OK):
```json
{
  "bufferSize": 150,
  "isFlushingInProgress": false,
  "maxBufferSize": 500,
  "emergencyThreshold": 5000,
  "bufferUtilization": 30
}
```

## Pipeline Behavior

### Dual-Trigger Flushing

Events are flushed to MongoDB when EITHER condition is met:
1. **Size trigger**: Buffer reaches 500 events
2. **Time trigger**: 1000ms since last flush

This ensures:
- High throughput for burst traffic (batch writes)
- Low latency for light traffic (events flushed within 1s)

### Buffer Overflow Protection

If buffer exceeds 5000 events (emergency threshold):
- New events are **dropped** to prevent OOM
- Warning logged for monitoring/alerting
- 503 response returned to client

In production, this should trigger alerts for scaling.

### Error Handling

| Error Type | HTTP Status | Behavior |
|------------|-------------|----------|
| Invalid payload | 400 | Return error, don't buffer |
| Buffer overflow | 503 | Drop event, suggest retry |
| Server error | 500 | Log error, return generic message |
| Duplicate event | 202 | Idempotent success (duplicate ignored) |

### Graceful Shutdown

On SIGTERM/SIGINT:
1. Stop accepting new HTTP connections
2. Wait for in-flight requests (10s timeout)
3. **Flush buffer** to MongoDB (critical: don't lose events)
4. Close database connection
5. Exit process

Test graceful shutdown:
```bash
# Start server
pnpm dev

# In another terminal, send events
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","sessionId":"test","type":"page_view"}'

# Gracefully shutdown (Ctrl+C or kill)
# Check logs: should see "Buffer flushed successfully"
```

## MongoDB Indexes

The Event model defines these indexes for optimal performance:

### 1. Compound Index (Primary)
```javascript
{ userId: 1, occurredAt: -1 }
```
- Supports efficient user journey queries
- Sorted retrieval (recent events first)
- High cardinality field first (userId)

### 2. Unique Index
```javascript
{ eventId: 1 }  // _id field
```
- Prevents duplicate events
- Enables idempotent retries

### 3. TTL Index (Optional)
```javascript
{ receivedAt: 1 }, { expireAfterSeconds: 7776000 }  // 90 days
```
- Auto-delete old events
- Uncomment in Event.ts if needed

## Performance

### Capacity (Single EC2 Instance)

- **Write throughput**: ~10,000 events/sec
- **Target load**: 1M events/day = ~12 events/sec
- **Headroom**: 833x capacity margin
- **Memory usage**: 500 events × 2KB = 1MB buffer

### Bottlenecks at 5M Events/Day

| Bottleneck | Mitigation |
|------------|------------|
| Single EC2 instance | Horizontal scaling (ALB + multiple instances) |
| In-memory buffer | Redis-backed buffer for durability |
| MongoDB single instance | Replica set or sharding |

## Testing

### Manual Testing

1. Start the server:
```bash
pnpm dev
```

2. Ingest test events:
```bash
# Single event
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","sessionId":"sess789","type":"page_view","payload":{"url":"/test"}}'

# Batch of events
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '[
    {"userId":"test123","sessionId":"sess789","type":"page_view","payload":{"url":"/home"}},
    {"userId":"test123","sessionId":"sess789","type":"search","payload":{"query":"laptop"}},
    {"userId":"test123","sessionId":"sess789","type":"purchase","payload":{"amount":999}}
  ]'
```

3. Query user journey:
```bash
curl "http://localhost:3000/users/test123/journey?limit=10"
```

4. Check buffer stats:
```bash
curl http://localhost:3000/stats
```

### Verify Database

```bash
mongosh

use martech
db.events.countDocuments()
db.events.find({userId: "test123"}).sort({occurredAt: -1}).limit(5)
db.events.getIndexes()
```

### Load Testing

Use Artillery or K6 for load testing:

```bash
# Install Artillery
npm install -g artillery

# Create load test config
cat > load-test.yml <<EOF
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 100
scenarios:
  - name: "Ingest events"
    flow:
      - post:
          url: "/events"
          json:
            userId: "user{{ \$randomNumber() }}"
            sessionId: "sess{{ \$randomNumber() }}"
            type: "page_view"
            payload:
              url: "/test"
EOF

# Run load test
artillery run load-test.yml
```

## Monitoring

### Key Metrics to Track

- **Buffer size**: Alert if > 4000 (near emergency threshold)
- **Flush rate**: Events/second throughput
- **Flush failures**: Database health indicator
- **Response latency**: 95th percentile tracking
- **Memory usage**: Detect memory leaks

### Structured Logging

All logs are prefixed with component for filtering:
- `[Bootstrap]` - Application startup
- `[Database]` - MongoDB connection events
- `[EventRepository]` - Data access operations
- `[EventIngestionService]` - Buffer and flush operations
- `[EventsController]` - HTTP request handling
- `[Shutdown]` - Graceful shutdown sequence

## Production Deployment

### Environment Variables

```env
MONGODB_URI=<your-mongodb-atlas-uri>
PORT=3000
NODE_ENV=production
```

### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'event-pipeline-api',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    kill_timeout: 15000,  // Allow 15s for graceful shutdown
    wait_ready: true,
    listen_timeout: 10000,
  }]
};
```

Start with PM2:
```bash
pnpm build
pm2 start ecosystem.config.js
```

### Production Checklist

- [ ] MongoDB indexes created (`db.events.getIndexes()`)
- [ ] Environment variables configured
- [ ] PM2 with graceful shutdown configured
- [ ] Health check endpoint accessible
- [ ] Load test completed (100 req/s sustained)
- [ ] Graceful shutdown tested (buffer flush verified)
- [ ] Buffer overflow tested (send 6000 events)
- [ ] Duplicate event handling verified (same eventId twice)
- [ ] Monitoring/alerting configured

## Troubleshooting

### Issue: Buffer Never Flushes

**Debug**: Check logs for flush attempts and `isFlushingInProgress` flag

**Fix**: Ensure MongoDB is accessible and check for connection errors

### Issue: Memory Leak

**Debug**: Monitor `/health` endpoint `memory.heapUsed` over time

**Fix**: Verify buffer is cleared after flush in logs

### Issue: Slow Queries

**Debug**: Run in MongoDB shell:
```javascript
db.events.find({userId: "test"}).sort({occurredAt: -1}).explain("executionStats")
```

**Fix**: Verify `stage: "IXSCAN"` (not `COLLSCAN`). If COLLSCAN, indexes may not be created.

### Issue: Duplicate Events

**Debug**: Check `eventId` generation in logs

**Fix**: Ensure server-side UUID generation (not client-provided)

## License

This project is part of a technical assessment for a user-tracking platform.

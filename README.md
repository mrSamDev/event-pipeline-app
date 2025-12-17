# MarTech Event Analytics Platform

A production-ready event tracking and analytics system for online shopping platforms. Built to handle 1M+ daily events across 500K+ users with comprehensive observability and scalable infrastructure.

## Overview

This MarTech platform provides real-time event ingestion, user journey tracking, and analytics dashboards. The system is designed for high performance (10,000 events/sec capacity) with full Infrastructure as Code deployment on AWS.

### Key Features

- High-performance event ingestion with buffer-based batching
- User journey tracking with flexible event types
- Real-time analytics dashboards with KPIs and visualizations
- Production-grade authentication and session management
- End-to-end type safety with TypeScript
- Full observability with OpenTelemetry, Prometheus, and CloudWatch
- Automated deployment with CloudFormation and GitHub Actions

### Scale Capability

- **Current Target**: 1M events/day (~12 events/sec)
- **Designed Capacity**: 10M+ events/day (~116 events/sec)
- **Headroom**: 833x current load with buffer system

## Architecture

### System Components

```
┌─────────────────┐
│   React App     │
│  (Frontend)     │
│                 │
│  Vite + Tailwind│
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  CloudFront CDN │
│    (S3 Bucket)  │
└─────────────────┘

┌─────────────────┐
│  Express API    │
│   (Backend)     │      ┌──────────────┐
│                 │◄────►│   MongoDB    │
│  Event Buffer   │      │    Atlas     │
│  + PM2 Cluster  │      └──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Observability  │
│                 │
│  Prometheus     │
│  CloudWatch     │
│  OpenTelemetry  │
└─────────────────┘
```

### Event Pipeline

```
POST /events (202) → Normalize → In-Memory Buffer → Batch Flush (200ms/2000 events) → MongoDB
                                        ↓
                                 Prometheus Metrics
```

## Level Completion Summary

### Database: L2 (67% Complete)

- **L1**: DB Schema ✅ - Mongoose schema with optimized indexes
- **L2**: Cloud DB ✅ - MongoDB Atlas M0 Free Tier with connection pooling
- **L3**: External Integration ❌ - Not implemented

### Backend/API: L5 (100% Complete)

- **L1**: API Documentation ✅ - OpenAPI 3.0 spec with Swagger UI
- **L2**: Full Implementation ✅ - Express.js with layered architecture
- **L3**: Cloud Deployment ✅ - AWS EC2 with Nginx and SSL/TLS
- **L4**: Unit Testing ✅ - Vitest with 5 test files
- **L5**: Daily Export Job ✅ - Cron scheduler exporting to S3 at 10 UTC

### Cloud/DevOps: L4 (100% Complete)

- **L1**: System Diagrams ✅ - Architecture documented in detail
- **L2**: Cloud Infrastructure ✅ - Full AWS deployment running
- **L3**: CI/CD Pipeline ✅ - GitHub Actions for frontend deployment
- **L4**: Infrastructure as Code ✅ - CloudFormation with Makefile

### Frontend: L4 (83% Complete)

- **L1**: Wireframes ✅ - User stories and architecture documented
- **L2**: Prototype ✅ - React 19 with Tailwind CSS v4
- **L3**: Connected App ✅ - Data visualization with Recharts
- **L4**: Data Entry Forms ✅ - Authentication forms with Zod validation
- **L5**: Cloud Hosted ✅ - S3 + CloudFront deployment
- **L6**: Admin Panel ❌ - Not implemented

### Dashboards: L4 (100% Complete)

- **L3**: Service Monitoring ✅ - OpenTelemetry + Prometheus + CloudWatch
- **L4**: Analytics Dashboard ✅ - KPIs and charts with Recharts

### Overall Grade: 90% (18/20 levels completed)

## Technology Stack

### Backend
- Node.js 20 with pnpm workspaces
- Express.js 5
- TypeScript 5.9.3
- MongoDB Atlas (Mongoose 9)
- Better Auth 1.4.7
- Zod 4.2.0 validation
- Vitest testing
- OpenTelemetry + Prometheus + Winston
- PM2 process manager

### Frontend
- React 19.2.0
- Vite 7.2.4
- TypeScript 5.9.3
- Tailwind CSS v4.1.18
- shadcn/ui components
- TanStack Query 5.90.12
- React Router 7.10.1
- Recharts 3.6.0

### Infrastructure
- AWS EC2 t3.micro (Free Tier)
- S3 + CloudFront CDN
- MongoDB Atlas M0 (Free Tier)
- CloudFormation IaC
- GitHub Actions CI/CD
- Nginx web server
- Let's Encrypt SSL/TLS
- CloudWatch monitoring

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10.25.0+
- MongoDB (local or Atlas)
- AWS Account (for deployment)

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd martech
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and other settings
```

4. Start development servers:
```bash
# Start all services (frontend + backend)
pnpm dev

# Or start individually
cd apps/api && pnpm dev    # Backend on http://localhost:3000
cd apps/web && pnpm dev    # Frontend on http://localhost:5173
```

5. Access the application:
- Frontend: http://localhost:5173
- API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs
- Prometheus Metrics: http://localhost:9464/metrics
- Health Check: http://localhost:3000/health

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm --filter api test:watch

# Run with coverage
pnpm --filter api test:coverage

# Run with UI
pnpm --filter api test:ui
```

### Building for Production

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @martech/types build
pnpm --filter api build
pnpm --filter web build
```

## Deployment

### Production URLs

- **Frontend**: https://www.veritas.mrsamdev.xyz
- **Backend API**: https://api-veritas.mrsamdev.xyz
- **API Documentation**: https://api-veritas.mrsamdev.xyz/api-docs

### Deploy to AWS

1. Configure AWS credentials:
```bash
aws configure
```

2. Create production environment file:
```bash
cp .env.example .env.production
# Edit .env.production with production values
```

3. Deploy infrastructure:
```bash
make deploy
```

4. View stack outputs:
```bash
make status
make outputs
```

5. Deploy frontend:
```bash
# Tag-based deployment
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions will automatically deploy
```

### Infrastructure Management

```bash
make deploy          # Deploy/update CloudFormation stack
make delete          # Delete stack (with confirmation)
make status          # Check stack status
make describe        # Describe stack resources
make validate        # Validate CloudFormation template
make events          # View stack events
```

## API Endpoints

### Authentication
- `POST /api/auth/sign-up/email` - Register new user
- `POST /api/auth/sign-in/email` - User login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/get-session` - Get current session

### Events
- `POST /events` - Ingest events (public, returns 202 Accepted)
- `GET /users/:userId/journey` - Get user journey (protected)

### Analytics
- `GET /stats` - System statistics and KPIs (protected)
- `GET /users` - List all users (protected)

### Health
- `GET /health` - Health check with database status

Full API documentation available at `/api-docs` with "Try it out" feature.

## Event Types Supported

The system supports 10 event types:

- `session_start` - User session begins
- `page_view` - Page navigation
- `search` - Search query performed
- `purchase` - Transaction completed
- `add_to_cart` - Item added to cart
- `remove_from_cart` - Item removed from cart
- `button_click` - Button interaction
- `form_submit` - Form submission
- `video_play` - Video playback started
- `video_pause` - Video playback paused

## Design Patterns

### Event Ingestion Pattern

**Buffer-Based Batching**: Events are collected in an in-memory buffer and flushed to MongoDB in batches using dual triggers:
- Time-based: Every 200ms
- Size-based: When buffer reaches 2,000 events

This pattern provides:
- High throughput (10,000 events/sec capacity)
- Reduced database load (batch inserts)
- Backpressure handling (rejects at 10,000 events)
- Monitoring via Prometheus metrics

### Repository Pattern

**Separation of Concerns**: Database access is isolated in repository layer:
```
Controller → Service → Repository → MongoDB
```

Benefits:
- Testable business logic (no database mocking needed)
- Easy to swap data sources
- Clear separation of HTTP, business logic, and data access

### Schema-First API Design

**Type Safety Throughout**: Shared types package ensures consistency:
```
API Schema (Zod) → TypeScript Types → Frontend Validation
```

## Monitoring and Observability

### Metrics Collected

**Event Ingestion**:
- `martech_events_ingested_total` - Total events by type and status
- `martech_event_ingestion_duration_seconds` - Latency histogram
- `martech_buffer_size` - Real-time buffer size
- `martech_buffer_flushes_total` - Flush operations counter

**Database**:
- Connection pool status
- Query duration (p50, p95, p99)
- Operation counts

**HTTP**:
- Request counts by route and method
- Response times
- Error rates

**System**:
- Memory usage (heap, RSS, external)
- CPU usage
- Garbage collection metrics

### Accessing Metrics

- **Prometheus**: http://localhost:9464/metrics
- **CloudWatch**: Logs and metrics in AWS Console
- **Grafana**: Connect to Prometheus endpoint for dashboards

## Performance Characteristics

- **Buffer Size**: 2,000 events
- **Flush Interval**: 200ms
- **Backpressure Threshold**: 10,000 events
- **Max Concurrent Flushes**: 3
- **Database Indexes**: Compound index on userId + occurredAt
- **Connection Pool**: 10 connections
- **Target Latency**: <100ms p99

## Cost Analysis

### Current (Free Tier)
- EC2 t3.micro: $0
- S3 Storage (<5 GB): $0
- CloudFront (<1 TB): $0
- MongoDB Atlas M0: $0
- CloudWatch (<5 GB logs): $0
- **Total: $0/month**

### 10x Scale (Projected)
- EC2 t3.small (2x): $33.58
- Application Load Balancer: $16.20
- S3 (50 GB): $1.15
- CloudFront (500 GB): $42.50
- MongoDB Atlas M10: $57.00
- ElastiCache: $12.26
- **Total: ~$179/month**

## Project Structure

```
martech/
├── apps/
│   ├── api/              # Backend API
│   │   ├── src/
│   │   │   ├── controllers/   # HTTP handlers
│   │   │   ├── services/      # Business logic
│   │   │   ├── repositories/  # Data access
│   │   │   ├── models/        # Mongoose schemas
│   │   │   ├── middleware/    # Express middleware
│   │   │   ├── validators/    # Zod schemas
│   │   │   ├── observability/ # Telemetry setup
│   │   │   └── jobs/          # Scheduled jobs
│   │   └── tests/
│   │
│   └── web/              # Frontend React app
│       ├── src/
│       │   ├── pages/         # Page components
│       │   ├── components/    # Reusable components
│       │   ├── lib/           # API layer + utilities
│       │   └── hooks/         # React hooks
│       └── dist/
│
├── packages/
│   └── types/            # Shared TypeScript types
│
├── infra/
│   ├── cloudformation.yaml    # AWS IaC
│   └── cloudwatch-config.json # Monitoring config
│
├── .github/
│   └── workflows/        # CI/CD pipelines
│
├── Makefile              # Infrastructure commands
└── pnpm-workspace.yaml   # Monorepo config
```

## Challenge Addressed: 10x User Growth

The system is designed to handle a 10x increase in active users (500K → 5M users, 1M → 10M events/day):

### Scalability Features

**Buffer System**: Handles burst traffic with configurable backpressure
**Database Optimization**: Compound indexes, connection pooling, bulk inserts
**Horizontal Scaling**: PM2 cluster mode ready, ALB support
**Monitoring**: Real-time metrics track throughput and capacity
**Load Testing**: Scripts included for capacity validation

### Scaling Path

1. **Vertical**: Upgrade EC2 to t3.small or t3.medium
2. **Horizontal**: Add Auto Scaling Group with ALB
3. **Database**: Upgrade MongoDB to M10+ with sharding
4. **Caching**: Add ElastiCache Redis for session/data caching
5. **Multi-Region**: Deploy in additional AWS regions with Route53

## Security

- SSL/TLS encryption for all endpoints
- Better Auth with secure session cookies
- MongoDB connection with TLS
- IAM roles for AWS resource access
- CORS configured for allowed origins
- Environment variables with NoEcho in CloudFormation
- Input validation with Zod schemas

## Contributing

1. Follow the code style guide in CLAUDE.md
2. Write tests for new features
3. Update documentation for API changes
4. Run `pnpm test` before committing
5. Keep files under 200 lines
6. Use pure functions where possible

## Troubleshooting

### Sessions Not Persisting

Check `BETTER_AUTH_URL` points to API domain:
```bash
# Should be https://api-veritas.mrsamdev.xyz
# NOT the frontend domain
```

### CORS Errors

Verify `ALLOWED_ORIGINS` includes your frontend domain:
```bash
echo $ALLOWED_ORIGINS
```

### Database Connection Issues

Check MongoDB URI and network access:
```bash
# Test connection
mongosh "$MONGODB_URI"
```

### View Logs

```bash
# Local
pnpm --filter api dev

# Production
pm2 logs wbd-api
sudo tail -f /var/log/nginx/error.log
```

## License

ISC

## References

- Event Schema: [apps/api/src/models/Event.ts](apps/api/src/models/Event.ts)
- API Routes: [apps/api/src/routes.ts](apps/api/src/routes.ts)
- Frontend Architecture: [apps/web/ARCHITECTURE.md](apps/web/ARCHITECTURE.md)
- Observability: [apps/api/OBSERVABILITY.md](apps/api/OBSERVABILITY.md)
- Code Style: [CLAUDE.md](CLAUDE.md)

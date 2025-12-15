# @martech/types

Shared TypeScript types for the MarTech monorepo.

## Overview

This package contains all shared type definitions used across the frontend (web) and backend (api) applications. By centralizing types here, we ensure consistency and type safety across the entire stack.

## Structure

```
src/
├── event.types.ts    # Event-related types and enums
├── user.types.ts     # User-related types
├── session.types.ts  # Session-related types
└── index.ts          # Main export file
```

## Usage

### In Backend (API)

```typescript
import { EventType, IEvent, IUser, ISession } from '@martech/types';

// Use types in your code
const event: IEvent = {
  eventId: '123',
  userId: 'user-1',
  sessionId: 'session-1',
  type: EventType.PAGE_VIEW,
  payload: { page: '/home' },
  occurredAt: new Date(),
  receivedAt: new Date(),
};
```

### In Frontend (Web)

```typescript
import { EventType, IEventCreate, IUser } from '@martech/types';

// Use types in your React components
const trackEvent = (type: EventType, payload: Record<string, any>) => {
  const event: IEventCreate = {
    eventId: crypto.randomUUID(),
    userId: currentUser.userId,
    sessionId: currentSession.sessionId,
    type,
    payload,
    occurredAt: new Date(),
  };

  // Send to API...
};
```

## Development

### Building

```bash
pnpm --filter @martech/types build
```

### Watch Mode

```bash
pnpm --filter @martech/types dev
```

## Types

### Event Types

- `EventType` - Enum of all supported event types
- `IEvent` - Complete event interface (includes server fields)
- `IEventCreate` - Event creation payload (what clients send)
- `IEventBatchRequest` - Batch event ingestion request
- `IEventIngestionResponse` - Event ingestion response

### User Types

- `IUser` - User interface
- `IUserCreate` - User creation payload
- `IUserUpdate` - User update payload
- `IUserProfile` - User profile with statistics

### Session Types

- `ISession` - Session interface
- `ISessionCreate` - Session creation payload
- `ISessionStats` - Session statistics

## Adding New Types

1. Add your types to the appropriate file (or create a new one)
2. Export them from `src/index.ts`
3. Build the package: `pnpm --filter @martech/types build`
4. Use the types in your apps

The types are linked via pnpm workspaces, so changes are immediately available to all apps.

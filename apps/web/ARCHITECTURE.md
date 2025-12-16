# Frontend Architecture

This document describes the feature-based architecture pattern used in this application.

## Architecture Pattern

The application follows a **feature-based architecture** with a consistent **schema-transformer-API pattern** across all features. Each feature is self-contained with its own:

1. **Schemas** - Zod schemas for runtime validation and type safety
2. **Transformers** - Data transformation layer between API and application models
3. **API** - Network requests and data fetching
4. **Hooks** - React Query hooks for state management
5. **Utils** - Feature-specific utilities (optional)

## Why This Pattern?

### Benefits

1. **Type Safety**: Zod schemas provide runtime validation and TypeScript types
2. **Separation of Concerns**: API models vs. App models are clearly separated
3. **Data Transformation**: Centralized place to transform API data to app-friendly formats
4. **Testability**: Each layer can be tested independently
5. **Maintainability**: Features are self-contained and easy to locate
6. **Scalability**: Easy to add new features following the same pattern

### The Schema-Transformer-API Pattern

```
API Response → Schema Validation → Transformer → App Model → Components
```

**Example Flow:**
```typescript
// 1. API returns raw data
{ userId: "123", lastActive: "2025-01-15T10:30:00Z" }

// 2. Schema validates it
apiUserMetricsSchema.parse(apiData)

// 3. Transformer converts it to app model
{
  userId: "123",
  lastActive: Date(2025-01-15T10:30:00Z),
  formattedLastActive: "1/15/2025, 10:30:00 AM"
}

// 4. Components use the app model
<TableCell>{user.formattedLastActive}</TableCell>
```

## Features Structure

```
src/features/
├── auth/
│   ├── schemas.ts       # Zod schemas for auth data
│   ├── api.ts           # Auth API calls
│   ├── hooks.ts         # React Query hooks
│   ├── context.tsx      # Auth context provider
│   └── index.ts         # Public API exports
├── users/
│   ├── schemas.ts       # User metrics schemas
│   ├── transformers.ts  # API ↔ App data transformers
│   ├── api.ts           # User API calls
│   ├── hooks.ts         # useUsers hook
│   └── index.ts         # Public API exports
├── analytics/
│   ├── schemas.ts       # Stats schemas
│   ├── transformers.ts  # Stats transformers
│   ├── api.ts           # Analytics API
│   ├── hooks.ts         # useStats hook
│   └── index.ts         # Public API exports
└── journey/
    ├── schemas.ts       # Event & session schemas
    ├── transformers.ts  # Journey transformers
    ├── api.ts           # Journey API
    ├── hooks.ts         # useUserJourney hook
    ├── utils.ts         # Event icons & formatting
    └── index.ts         # Public API exports
```

## Pattern Details

### 1. Schemas (`schemas.ts`)

Define Zod schemas for:
- **API schemas** - Data from the server
- **App schemas** - Data used in the application
- **Type exports** - TypeScript types inferred from schemas

```typescript
// API schema (what the server sends)
const apiUserMetricsSchema = z.object({
  userId: z.string(),
  lastActive: z.string(),  // ISO date string
});

// App schema (what the app uses)
const appUserMetricsSchema = z.object({
  userId: z.string(),
  lastActive: z.instanceof(Date),  // Parsed Date object
  formattedLastActive: z.string(), // Pre-formatted string
});

export type ApiUserMetrics = z.infer<typeof apiUserMetricsSchema>;
export type AppUserMetrics = z.infer<typeof appUserMetricsSchema>;
```

### 2. Transformers (`transformers.ts`)

Transform data between API and App models:

```typescript
export const userMetricsTransformer = {
  fromAPI(apiData: ApiUserMetrics): AppUserMetrics {
    const lastActive = new Date(apiData.lastActive);

    return {
      userId: apiData.userId,
      lastActive,
      formattedLastActive: lastActive.toLocaleString(),
    };
  },

  toAPI(appData: AppUserMetrics): ApiUserMetrics {
    return {
      userId: appData.userId,
      lastActive: appData.lastActive.toISOString(),
    };
  },
};
```

### 3. API Layer (`api.ts`)

Handle network requests with validation and transformation:

```typescript
export async function fetchUsers(): Promise<AppUserMetrics[]> {
  const response = await fetch(`${API_BASE}/users`);

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  const apiData = await response.json();

  // Validate and transform each item
  return apiData.map((user: unknown) => {
    const validated = apiUserMetricsSchema.parse(user);
    return userMetricsTransformer.fromAPI(validated);
  });
}
```

### 4. Hooks (`hooks.ts`)

React Query hooks for data fetching and caching:

```typescript
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}
```

### 5. Index (`index.ts`)

Public API for the feature:

```typescript
export * from './schemas';
export * from './transformers';
export * from './api';
export * from './hooks';
```

## Usage in Components

Components import from features, not individual files:

```typescript
// ✅ Good - Import from feature
import { useUsers } from '../features/users';
import type { AppUserMetrics } from '../features/users';

// ❌ Bad - Import from individual files
import { useUsers } from '../hooks/useUsers';
```

## Data Flow Example

**User Journey Feature:**

```
1. Component calls hook:
   const { data: sessions } = useUserJourney(userId)

2. Hook calls API function:
   fetchUserJourney(userId)

3. API fetches and validates:
   apiJourneyResponseSchema.parse(apiData)

4. Transformer converts events:
   validated.events.map(journeyTransformer.fromAPI)

5. Transformer groups by session:
   journeyTransformer.groupBySession(appEvents)

6. Component receives SessionGroup[]:
   sessions.map(session => ...)
```

## Key Principles

1. **Single Source of Truth**: Each feature owns its data shape and transformations
2. **Type Safety**: Zod provides runtime validation + TypeScript types
3. **Immutable Transformations**: Transformers create new objects, never mutate
4. **Fail Fast**: Schema validation happens immediately after API calls
5. **DRY**: Common patterns (date formatting, grouping) in transformers
6. **Testable**: Each layer can be unit tested independently

## Adding a New Feature

1. Create feature folder: `src/features/my-feature/`
2. Add `schemas.ts` with API and App schemas
3. Add `transformers.ts` with bidirectional transformers
4. Add `api.ts` with network calls + validation + transformation
5. Add `hooks.ts` with React Query hooks
6. Add `index.ts` to export public API
7. Use in components via feature imports

## Testing Strategy

```typescript
// Test schemas
describe('apiUserMetricsSchema', () => {
  it('validates correct data', () => {
    expect(() => apiUserMetricsSchema.parse(validData)).not.toThrow();
  });
});

// Test transformers
describe('userMetricsTransformer', () => {
  it('transforms API data to app model', () => {
    const result = userMetricsTransformer.fromAPI(apiData);
    expect(result.lastActive).toBeInstanceOf(Date);
  });
});

// Test API
describe('fetchUsers', () => {
  it('fetches and transforms users', async () => {
    const users = await fetchUsers();
    expect(users[0]).toHaveProperty('formattedLastActive');
  });
});
```

## Best Practices

1. **Always validate API responses** with Zod schemas
2. **Transform data at the boundary** (in the API layer)
3. **Keep components dumb** - they only display pre-formatted data
4. **Use TypeScript types** derived from Zod schemas
5. **Document transformations** that aren't obvious
6. **Handle errors** at the API layer, not in transformers
7. **Keep transformers pure** - no side effects
8. **Pre-format data** in transformers (dates, numbers, etc.)

## Migration from Old Pattern

Old pattern:
```typescript
// Component does everything
const [users, setUsers] = useState([]);
useEffect(() => {
  async function load() {
    const data = await fetch('/users').then(r => r.json());
    const formatted = data.map(u => ({
      ...u,
      lastActive: new Date(u.lastActive).toLocaleString()
    }));
    setUsers(formatted);
  }
  load();
}, []);
```

New pattern:
```typescript
// Component just uses the hook
const { data: users = [] } = useUsers();
// Data is already validated, transformed, and formatted!
```

# Analytics Dashboard

A secure analytics dashboard for visualizing user behavior and event data with authentication.

## Overview

This is an internal analytics platform similar to Mixpanel/Amplitude/GA. It visualizes user journeys and behavior analytics with role-based access control.

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 7
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Brand: #004747)
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Routing**: React Router DOM
- **Data Fetching**: TanStack Query (React Query)
- **Validation**: Zod
- **Authentication**: Better Auth (backend integration)

## Features

### Authentication
- **Sign Up**: User registration with email/password
- **Login**: Secure authentication with Better Auth
- **Protected Routes**: All analytics views require authentication
- **Session Management**: Automatic session handling with TanStack Query
- **Form Validation**: Client-side validation with Zod schemas

### 1. Users Overview
- Entry point showing all users in a table
- Displays per-user metrics:
  - Total sessions
  - Total events
  - Last active timestamp
- Click any user to view their journey

### 2. User Journey View
- Time-ordered event timeline for a single user
- Events grouped by session
- Shows:
  - Event type with icon
  - Timestamp
  - Event metadata/payload
- Visual timeline with connecting lines
- Back navigation to users list

### 3. Analytics Dashboard
- High-level KPIs:
  - Total users
  - Total events
  - Average events per user
- Charts:
  - Events per day (line chart)
  - Events by type (bar chart)
- Top 5 most common event types

## API Endpoints

### Authentication
- `POST /api/auth/sign-up/email` - User registration
- `POST /api/auth/sign-in/email` - User login
- `POST /api/auth/sign-out` - User logout
- `GET /session` - Get current session

### Analytics
- `GET /users` - List all users with aggregated metrics
- `GET /users/:userId/journey` - Get time-ordered events for a user
- `GET /stats` - Get analytics statistics (totals, charts data)

## Running the App

### Development
```bash
pnpm --filter web dev
```

### Build
```bash
pnpm --filter web build
```

### Preview Production Build
```bash
pnpm --filter web preview
```

## Environment Variables

Create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:3000
```

## Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── table.tsx
│   └── ProtectedRoute.tsx     # Route protection wrapper
├── contexts/
│   └── AuthContext.tsx        # Auth state management
├── hooks/
│   ├── useUsers.ts            # TanStack Query hook
│   ├── useUserJourney.ts      # TanStack Query hook
│   └── useStats.ts            # TanStack Query hook
├── lib/
│   ├── api.ts                 # API client functions
│   ├── auth.ts                # Auth API functions
│   ├── schemas.ts             # Zod validation schemas
│   └── utils.ts               # Utility functions
├── pages/
│   ├── Login.tsx              # Login page
│   ├── SignUp.tsx             # Registration page
│   ├── Dashboard.tsx          # Analytics summary
│   ├── UsersOverview.tsx      # Users list
│   └── UserJourney.tsx        # User timeline
├── App.tsx                    # Main app with routing
└── main.tsx                   # Entry point
```

## Authentication Flow

1. User visits the app and is redirected to `/login`
2. User can sign up at `/signup` or log in
3. Upon successful authentication, session is stored via cookies
4. TanStack Query manages session state and caching
5. Protected routes check authentication before rendering
6. User can logout from the navigation bar

## Data Fetching Pattern

All data fetching uses TanStack Query for:
- Automatic caching and background refetching
- Loading and error states
- Request deduplication
- Optimistic updates

Example:
```typescript
const { data, isLoading, error } = useUsers();
```

## Form Validation

Forms use Zod for type-safe validation:
- Real-time field validation
- Schema-based type inference
- Clear error messages
- Server-side validation alignment

## Code Style

This project follows strict code style guidelines:
- Files under 200 lines
- Functions under 50 lines
- Pure functions preferred
- No side effects
- Clear naming without abbreviations
- Minimal comments (code should be self-documenting)

See [CLAUDE.md](../../CLAUDE.md) for complete style guide.

## Brand Colors

Primary brand color: `#004747` (deep teal)
- Used for buttons, links, and active states
- Gradient backgrounds for auth pages
- Chart colors for data visualization

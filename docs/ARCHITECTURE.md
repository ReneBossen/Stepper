# Stepper - Architecture Overview

## What is Stepper?

Stepper is a mobile fitness application that helps users track their daily steps, compete with friends, and join groups for motivation. Built for people who want to stay active and engaged through friendly competition.

## High-Level Architecture

See diagram: [System Overview](diagrams/system-overview.drawio)

### Architecture Pattern: API Gateway

All mobile app data operations route through the .NET backend API. The mobile app does **not** make direct database calls to Supabase.

```
Mobile App  -->  .NET API (/api/v1/*)  -->  Supabase Database
     ^                                            |
     |                                            v
     +------------ Real-time only ---------------+
                 (WebSocket subscriptions)
```

This pattern provides:

- **Single entry point** for all data operations
- **Centralized business logic** in the .NET backend
- **Consistent validation** and error handling
- **Security layer** between mobile app and database
- **Easier debugging** with request logging at the API level

### API Versioning

The API uses versioned endpoints with the prefix `/api/v1/` for all routes. This allows for future API evolution without breaking existing clients.

### Real-time Subscription Exceptions

While all data queries go through the .NET API, the mobile app maintains direct Supabase connections for real-time features:

| Feature | Purpose | Why Direct Connection |
|---------|---------|----------------------|
| Group Leaderboard | Live position updates | WebSocket subscriptions for instant updates |
| Activity Feed | Friend activity notifications | Real-time push of new events |

These are acceptable exceptions because:
- They are WebSocket connections, not REST queries
- Real-time subscriptions require persistent connections
- The .NET API still handles all data mutations
- RLS policies protect data at the database level

## System Layers

### Mobile App (React Native + Expo)

The mobile application handles:
- User interface and navigation
- Health data integration (HealthKit/Google Fit)
- Local state management with Zustand
- API communication via fetch/axios
- Real-time subscriptions via Supabase client

### Backend API (.NET 10)

The backend provides:
- RESTful API endpoints
- Business logic and validation
- Authentication token verification
- Data transformation and aggregation
- Error handling and logging

### Database (PostgreSQL via Supabase)

The database layer manages:
- Data persistence
- Row-Level Security (RLS) for authorization
- Real-time subscriptions
- User authentication (Supabase Auth)

## Key Features

- **Step Tracking**: Record and view daily step counts synced from device health APIs
- **Friends**: Connect with other users, send friend requests, view friend activity
- **Groups**: Create or join groups, compete on leaderboards, earn achievements
- **Notifications**: Stay informed about friend requests, group invitations, and milestones
- **User Profiles**: Customize display name, avatar, and notification preferences

## Data Flow

See diagram: [Data Flow](diagrams/data-flow.drawio)

### Standard Data Operations

For typical CRUD operations:

1. User interacts with the mobile app
2. Mobile app sends request to .NET API with auth token
3. API validates token and extracts user identity
4. API executes business logic
5. Repository queries Supabase database (RLS applied)
6. Response flows back through layers to mobile app

### Real-time Updates

For live data (leaderboards, activity feed):

1. Mobile app establishes WebSocket connection to Supabase
2. App subscribes to relevant tables/channels
3. When data changes, Supabase pushes updates
4. App updates UI immediately
5. RLS ensures users only receive authorized data

## Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Mobile | React Native + Expo | Cross-platform, fast development, TypeScript support |
| Backend | .NET 10 (C# 13) | Strong typing, performance, excellent tooling |
| Database | PostgreSQL (Supabase) | RLS for security, real-time built-in, managed service |
| Auth | Supabase Auth | Integrated with database, handles OAuth providers |
| State | Zustand | Lightweight, TypeScript-friendly, simple API |

## Security Model

### Authentication

1. User signs in via mobile app using Supabase Auth
2. Supabase returns JWT access token
3. Mobile app includes token in all API requests
4. .NET backend validates token signature
5. User identity extracted from token claims

### Authorization

Two-layer protection:

- **API Layer**: Business rule validation in services
- **Database Layer**: Row-Level Security policies enforce data access

Users can only access:
- Their own profile and settings
- Friends' public information
- Groups they belong to
- Activity from friends and group members

## Project Structure

The codebase follows **Screaming Architecture** principles where folders reflect business domains, not technical layers.

### Backend Structure

```
WalkingApp.Api/
    Auth/           # Authentication endpoints
    Users/          # User profiles and preferences
    Steps/          # Activity tracking
    Friends/        # Social connections
    Groups/         # Group management
    Notifications/  # User notifications
    Activity/       # Activity feed
    Common/         # Shared infrastructure
```

### Mobile Structure

```
mobile/
    app/            # Expo Router pages
    components/     # Reusable UI components
    services/       # API integration layer
    store/          # Zustand state stores
    hooks/          # Custom React hooks
    types/          # TypeScript definitions
```

## API Reference

For a complete list of API endpoints, see [API Reference](API_REFERENCE.md).

## Getting Started

- **Backend Setup**: See the README in `/WalkingApp.Api`
- **Mobile Setup**: See the README in `/mobile`
- **Database Setup**: See [Database Setup Guide](DATABASE_SETUP.md)
- **Android Emulator**: See [Android Emulator Setup](ANDROID_EMULATOR_SETUP.md)

## Diagrams

Architecture diagrams are available in `docs/diagrams/`:

| Diagram | File | Description |
|---------|------|-------------|
| System Overview | [system-overview.drawio](diagrams/system-overview.drawio) | High-level system components and connections |
| Data Flow | [data-flow.drawio](diagrams/data-flow.drawio) | How data moves through the system |
| User Journey | `user-journey.drawio` | To be created - typical user flows |

## Architecture Decision Records

For significant architectural decisions, see `docs/architecture/decisions/`.

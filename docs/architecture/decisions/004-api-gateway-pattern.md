# ADR-004: .NET API Gateway Between Mobile App and Supabase

## Status

Accepted

## Context

With Supabase providing the database and authentication, the team needed to decide whether the mobile app should communicate directly with Supabase or route all data operations through a backend API. Direct communication is simpler to set up, but a gateway provides control over business logic, validation, and security.

## Decision

Adopted a .NET API gateway pattern. All data mutations and queries from the mobile app route through the .NET backend API, which then communicates with Supabase. The only exceptions are real-time WebSocket subscriptions (group leaderboards, activity feed), which connect directly from the mobile app to Supabase for low-latency live updates.

## Consequences

### Positive

- Centralized business logic and validation in one place, not scattered across mobile clients
- Single entry point simplifies debugging, logging, and monitoring
- Backend can transform and aggregate data before sending to the client, reducing mobile bandwidth
- Security layer prevents direct database access from untrusted mobile clients
- API versioning allows backend evolution without breaking existing mobile app versions

### Negative

- Additional network hop increases latency compared to direct Supabase calls
- Backend becomes a single point of failure; if the API is down, the app cannot function
- More infrastructure to deploy and maintain compared to a client-only architecture
- Real-time features still bypass the gateway, creating two communication paths to manage

## Alternatives Considered

- **Direct Supabase access from mobile app**: Rejected because it scatters business logic across the client, makes validation inconsistent, and exposes database structure to the mobile app.
- **Serverless functions (Supabase Edge Functions)**: Rejected because the team's primary expertise is in .NET, and a full API server provides better debugging, testing, and middleware capabilities.

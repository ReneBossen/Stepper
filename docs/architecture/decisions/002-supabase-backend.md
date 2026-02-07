# ADR-002: Supabase as Database and Auth Provider

## Status

Accepted

## Context

The project required a PostgreSQL database with user authentication, row-level security, and real-time subscription capabilities. The team needed to decide between self-managed PostgreSQL with custom authentication, or a managed platform that bundles these concerns together.

## Decision

Adopted Supabase as the combined database and authentication provider. Supabase delivers managed PostgreSQL with built-in Row-Level Security (RLS), a complete authentication system supporting multiple OAuth providers, and real-time WebSocket subscriptions for live data updates.

## Consequences

### Positive

- Authentication, database, and real-time features come as a single integrated platform
- Row-Level Security provides a database-level authorization layer, reducing the attack surface
- Real-time subscriptions are available out of the box for features like leaderboards and activity feeds
- Managed infrastructure eliminates operational overhead for database administration
- Built-in support for OAuth providers (Google, Apple) simplifies social login

### Negative

- Vendor lock-in to Supabase's platform and API conventions
- RLS policies require careful design and testing to avoid data leaks
- Supabase's client SDK becomes a dependency across both backend and mobile codebases
- Migration away from Supabase would require significant effort to replace auth and real-time features

## Alternatives Considered

- **Self-managed PostgreSQL with custom JWT auth**: Rejected due to the operational burden of managing infrastructure and building authentication from scratch.
- **Firebase**: Rejected because it uses a NoSQL document model, which is a poor fit for the relational data structures in this application (friendships, group memberships, leaderboards).
- **Auth0 + managed PostgreSQL**: Rejected to avoid coordinating two separate managed services when Supabase provides both in one platform.

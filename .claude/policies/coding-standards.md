# Coding Standards

## Technology Stack

- **Backend**: .NET 10 (C# 13)
- **Frontend**: Expo + React Native (TypeScript)
- **Database**: PostgreSQL via Supabase
- **Data Access**: Supabase .NET Client
- **Authentication**: Supabase Auth (no custom JWT implementation)
- **Testing**: xUnit + NetArchTest (architecture rules)

## Core Principles

### DRY (Don't Repeat Yourself)
- Extract common logic into reusable methods or services
- Use shared abstractions for cross-cutting concerns
- Avoid copy-paste duplication

### SOLID Principles
- **S**ingle Responsibility: Each class has one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for base types
- **I**nterface Segregation: Prefer small, focused interfaces
- **D**ependency Inversion: Depend on abstractions, not concretions

### Clean Code
- Meaningful names for variables, methods, and classes
- Small, focused methods (single level of abstraction)
- Self-documenting code over excessive comments
- Prefer clarity over cleverness

## C# Rules

- Nullable reference types enabled
- No magic strings; use constants or strongly typed identifiers
- Guard clauses for invariants
- Prefer immutability in Domain where practical
- Prefer constructor injection
- Avoid static state
- No async void (except event handlers)
- Remove unused usings
- No nested classes
- Explicit interfaces for Application services
- Public APIs must have XML documentation

## Code Organization

- One class per file
- Logical grouping of members within classes
- Consistent file and folder naming conventions

## Supabase Patterns

- Use Supabase client for all database operations
- Trust Row-Level Security (RLS) policies for authorization
- Extract user ID from Supabase JWT token claims
- Use Supabase real-time subscriptions for live data
- Store Supabase credentials in environment variables, never hardcode
- Use Supabase connection pooling (handled by Supabase)

## Testing Standards

- Framework: xUnit
- Architecture tests: NetArchTest for enforcing dependency rules
- Deterministic tests only (no timing, no network)
- Test behavior, not implementation details
- Arrange-Act-Assert pattern
- Meaningful test names describing the scenario
- Mock Supabase client for unit tests
- Use test database for integration tests

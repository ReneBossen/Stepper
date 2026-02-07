# ADR-001: Screaming Architecture with Vertical Slices

## Status

Accepted

## Context

The project needed an architecture pattern that makes the codebase navigable by business domain rather than technical layer. Traditional layered architectures (Controllers/, Services/, Repositories/) force developers to jump between distant folders to understand a single feature. For a domain-rich application like a fitness tracker with distinct features (steps, friends, groups, notifications), the folder structure should communicate the business purpose at a glance.

## Decision

Adopted Screaming Architecture with vertical slices. Each feature (Users, Steps, Friends, Groups, Auth, Activity, Notifications) is a self-contained folder containing its Controller, Service, Repository, DTOs, and domain models. Shared infrastructure (authentication, middleware, Supabase client) lives in a Common/ folder.

## Consequences

### Positive

- Features are cohesive and easy to find; the folder structure "screams" the domain
- New developers immediately understand what the application does by reading the top-level folders
- Changes to one feature are isolated and do not impact others
- Each vertical slice can be developed and tested independently

### Negative

- Some code duplication across slices (e.g., authentication checks, response mapping)
- Shared logic must be carefully placed in Common/ to avoid cross-slice coupling
- Requires discipline to prevent one slice from directly referencing another slice's internals

## Alternatives Considered

- **Traditional layered architecture** (Controllers/, Services/, Repositories/): Rejected because it obscures business intent and couples unrelated features at each layer.
- **Clean Architecture with project separation**: Rejected as over-engineering for a mobile backend of this scope.

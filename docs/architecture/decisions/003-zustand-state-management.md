# ADR-003: Zustand for State Management

## Status

Accepted

## Context

The React Native mobile app needed a state management solution to handle global application state across multiple domains: authentication, user profiles, step data, friends, groups, and notifications. The solution needed to be TypeScript-friendly, lightweight, and simple enough to avoid boilerplate overhead.

## Decision

Adopted Zustand as the state management library. Each business domain has its own dedicated store (authStore, userStore, stepsStore, friendsStore, groupsStore, notificationsStore, analyticsStore), keeping state organized by feature and consistent with the backend's vertical slice structure.

## Consequences

### Positive

- Minimal boilerplate compared to Redux; stores are plain functions with no action creators or reducers
- Excellent TypeScript support with full type inference
- Each store is independent, matching the backend's feature-per-folder organization
- Small bundle size with no additional middleware dependencies required
- Simple API that new contributors can learn quickly

### Negative

- Less ecosystem tooling compared to Redux (fewer DevTools, middleware options)
- No built-in middleware for side effects; async logic lives directly in store actions
- Less opinionated structure means the team must self-enforce conventions

## Alternatives Considered

- **Redux Toolkit**: Rejected because the boilerplate overhead (slices, thunks, selectors) was disproportionate for this application's complexity.
- **MobX**: Rejected due to its reliance on decorators and observable patterns, which add conceptual complexity without clear benefit for this use case.
- **React Context + useReducer**: Rejected because it leads to performance issues with frequent re-renders in large state trees and lacks built-in persistence support.

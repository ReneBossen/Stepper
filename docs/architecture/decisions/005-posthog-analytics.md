# ADR-005: PostHog for Analytics and Feature Flags

## Status

Accepted

## Context

The application needed analytics to understand user behavior, track feature adoption, and measure engagement metrics such as step goal completion rates and social feature usage. The solution also needed to support feature flags for controlled rollouts and GDPR-compliant consent management.

## Decision

Adopted PostHog as the analytics and feature flags platform. The integration uses PostHog's React Native SDK on the mobile app with a centralized analytics service, a configuration-driven milestone system, and GDPR consent management. All analytics data flows directly from the mobile app to PostHog without routing through the backend API.

## Consequences

### Positive

- Self-hosted option available, giving full control over user data if needed
- Feature flags enable gradual rollouts and A/B testing without app updates
- Built-in session replay helps diagnose user experience issues
- Configuration-driven milestone system makes adding new tracked events straightforward
- Anonymous-to-identified user linking preserves pre-login analytics data

### Negative

- Adds a third-party dependency to the mobile app's network layer
- Analytics data flows directly to PostHog, bypassing the API gateway pattern used for other data
- Requires careful consent management to comply with GDPR requirements
- SDK adds to the mobile app's bundle size

## Alternatives Considered

- **Mixpanel**: Rejected due to higher pricing at scale and less flexibility for self-hosting.
- **Firebase Analytics**: Rejected to avoid deep coupling to Google's ecosystem when the project already uses Supabase.
- **Custom analytics backend**: Rejected because building event ingestion, storage, dashboards, and feature flags from scratch is a significant engineering investment with no clear advantage.

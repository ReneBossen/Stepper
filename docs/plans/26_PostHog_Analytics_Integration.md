# Plan: PostHog Analytics Integration

## Summary

This plan covers the integration of PostHog analytics into the Stepper to track user behavior, feature usage, and key business metrics. The solution implements a centralized analytics service with a configuration-driven milestone system, comprehensive event tracking (54 events, 12 user properties), and GDPR compliance with consent management.

## Affected Feature Slices

- **Common**: Analytics service, types, hooks, configuration, utilities
- **Auth**: Registration and login event tracking
- **Users**: User property management, onboarding tracking
- **Steps**: Step tracking events, goal achievements, health sync events
- **Friends**: Social interaction tracking, milestone events
- **Groups**: Competition and group activity tracking
- **Settings**: Preference change tracking, privacy controls, consent management

## Goals

1. Integrate PostHog React Native SDK for event tracking
2. Implement all 54 specified analytics events
3. Track 12 user properties with automatic updates
4. Build an extensible, configuration-driven milestone system
5. Enable session replay and feature flags capabilities
6. Ensure GDPR compliance with consent management
7. Support anonymous-to-identified user linking

## Non-Goals

- Backend analytics endpoints (PostHog handles data collection)
- Custom analytics dashboard (use PostHog dashboard)
- Real-time analytics processing
- Custom data warehouse integration

## Architecture Overview

```
+------------------------------------------------------------------+
|                       App Components                              |
|  (Screens, Hooks, Stores, Services)                              |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                    useAnalytics() Hook                           |
|  - React-friendly interface for tracking                         |
|  - Feature flag access                                           |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                   Analytics Service                               |
|  - Event tracking, User identification                           |
|  - Property management, Consent enforcement                      |
+------------------------------------------------------------------+
          |                   |                        |
          v                   v                        v
+------------------+  +------------------+  +------------------+
| Milestone Engine |  |  PostHog SDK     |  | Consent Manager  |
|  - Definitions   |  |  - Events        |  |  - Storage       |
|  - Evaluators    |  |  - Identify      |  |  - GDPR hooks    |
|  - Triggers      |  |  - Feature Flags |  |                  |
+------------------+  +------------------+  +------------------+
```

## File Structure

```
Stepper.Mobile/src/
  services/
    analytics/
      analyticsService.ts         # Core analytics service
      analyticsTypes.ts           # Event and property type definitions
      postHogClient.ts            # PostHog SDK wrapper
      consentManager.ts           # GDPR consent management
      index.ts                    # Public exports
    milestones/
      milestoneEngine.ts          # Milestone evaluation engine
      milestoneDefinitions.ts     # Milestone configuration registry
      milestoneTypes.ts           # Milestone type definitions
      index.ts                    # Public exports
  hooks/
    useAnalytics.ts               # React hook for analytics
    useFeatureFlag.ts             # React hook for feature flags
  config/
    analytics.config.ts           # PostHog configuration
  store/
    analyticsStore.ts             # Analytics state (consent, etc.)
```

## Proposed Types

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `AnalyticsEvent` | analyticsTypes.ts | Union type of all 54 event names |
| `EventPropertiesMap` | analyticsTypes.ts | Maps events to their required properties |
| `UserProperties` | analyticsTypes.ts | 12 user property definitions |
| `AnalyticsService` | analyticsService.ts | Core analytics interface |
| `MilestoneDefinition` | milestoneTypes.ts | Configuration for a milestone |
| `MilestoneEvaluator` | milestoneTypes.ts | How to evaluate a milestone |
| `MilestoneContext` | milestoneTypes.ts | Context passed to evaluators |
| `AchievedMilestone` | milestoneTypes.ts | Record of achieved milestone |
| `MilestoneCategory` | milestoneTypes.ts | Categorization (social, streak, achievement, etc.) |
| `ConsentState` | consentManager.ts | GDPR consent tracking |

## Event Categories

### Authentication and Onboarding (8 events)
- `registration_started`, `registration_completed`, `registration_method`
- `login_completed`, `logout_completed`
- `onboarding_step_completed`, `onboarding_completed`, `onboarding_skipped`

### Health Integration (6 events)
- `health_permission_requested`, `health_permission_granted`, `health_permission_denied`
- `health_sync_completed`, `health_sync_failed`
- `step_entry_added` (with source: HealthKit/Google Fit/Manual)

### Social Features (12 events)
- Friend lifecycle: `friend_request_sent`, `friend_request_accepted`, `friend_request_declined`, `friend_added`, `friend_removed`, `friend_profile_viewed`
- Discovery: `qr_scanner_used`
- Milestones: `first_friend_added`, `social_threshold_reached`
- Groups: `group_created`, `group_joined`, `group_left`, `first_group_joined`

### Competition (4 events)
- `leaderboard_viewed`, `rank_changed`, `competition_period_ended`, `invite_sent`

### Daily Engagement (10 events)
- Sessions: `app_opened`, `session_started`, `session_ended`
- Navigation: `screen_viewed`, `tab_switched`
- Notifications: `notification_received`, `notification_clicked`
- Interactions: `pull_to_refresh`, `activity_feed_item_clicked`, `manual_entry_modal_opened`

### Goal Achievement (6 events)
- `daily_goal_achieved`, `daily_goal_missed`
- `streak_milestone` (3, 7, 14, 30, 60, 90 days)
- `personal_best_achieved`, `goal_changed`, `weekly_summary_viewed`

### Settings and Preferences (4 events)
- `preference_changed`, `privacy_setting_changed`, `notification_setting_changed`, `theme_changed`

### Errors (4 events)
- `api_error`, `health_sync_error`, `network_error`, `validation_error`

## User Properties (12 total)

| Property | Type | Update Trigger |
|----------|------|----------------|
| `platform` | ios/android | On initialization |
| `app_version` | string | On initialization |
| `device_model` | string | On initialization |
| `daily_step_goal` | number | On goal change |
| `friend_count` | number | On friend add/remove |
| `group_count` | number | On group join/leave |
| `total_steps_lifetime` | number | On steps sync |
| `current_streak` | number | On streak change |
| `days_since_registration` | number | On app open (daily) |
| `health_provider` | healthkit/googlefit/manual/none | On health connection change |
| `notifications_enabled` | boolean | On notification toggle |
| `theme_preference` | light/dark/system | On theme change |

## Milestone System Architecture

The milestone system is designed to be **configuration-driven and easily extensible**.

### Core Concepts

1. **Milestone Definition**: A declarative object describing a milestone
   - ID, name, description
   - Category (social, streak, achievement, fitness, competition)
   - Evaluator configuration (threshold-based, first-time, comparison, or custom)
   - Analytics event to fire when achieved
   - Repeatability flag

2. **Milestone Evaluator Types**:
   - **Threshold**: Achieved when metric reaches/exceeds a value
   - **First-time**: Achieved when metric goes from 0 to >0
   - **Comparison**: Achieved when current > previous
   - **Custom**: Custom evaluation function

3. **Milestone Registry**: Central array of all milestone definitions
   - Adding new milestones requires only adding to this array
   - No changes to engine code required

4. **Milestone Engine**: Evaluates definitions against metrics
   - Called when relevant metrics change
   - Persists achieved milestones to AsyncStorage
   - Fires analytics events on achievement

### Initial Milestones

| ID | Category | Trigger | Event |
|----|----------|---------|-------|
| `first_friend` | social | friend_count >= 1 | `first_friend_added` |
| `social_butterfly` | social | friend_count >= 3 | `social_threshold_reached` |
| `first_group` | social | group_count >= 1 | `first_group_joined` |
| `streak_3_day` | streak | streak >= 3 | `streak_milestone` |
| `streak_7_day` | streak | streak >= 7 | `streak_milestone` |
| `streak_14_day` | streak | streak >= 14 | `streak_milestone` |
| `streak_30_day` | streak | streak >= 30 | `streak_milestone` |
| `streak_60_day` | streak | streak >= 60 | `streak_milestone` |
| `streak_90_day` | streak | streak >= 90 | `streak_milestone` |

### Extensibility

To add a new milestone (e.g., "Step Master - 1 million lifetime steps"):
1. Add definition object to milestone registry array
2. Engine automatically evaluates it when relevant metric changes
3. No code changes to engine or evaluation logic required

## GDPR Compliance

### Consent Flow
1. Prompt user during onboarding for analytics consent
2. Store consent state locally (AsyncStorage)
3. Analytics service checks consent before any tracking
4. No events fire without consent

### User Rights
- View consent status in Settings
- Toggle consent on/off at any time
- "Delete my data" option clears local analytics data and PostHog distinct ID

### Data Handling
- Consent timestamp recorded for audit trail
- Consent version tracked for policy updates
- All tracking respects Do Not Track browser/device setting

## Implementation Steps

### Phase 1: Foundation
1. Add `posthog-react-native` package dependency
2. Create analytics configuration file
3. Create event and property type definitions
4. Implement PostHog client wrapper
5. Implement consent manager
6. Implement core analytics service
7. Create analytics Zustand store

### Phase 2: Milestone System
8. Create milestone type definitions
9. Create milestone definitions registry
10. Implement milestone evaluation engine
11. Export milestone module

### Phase 3: React Integration
12. Create `useAnalytics` hook
13. Create `useFeatureFlag` hook

### Phase 4: Event Integration
14. App lifecycle events (app open, session start/end)
15. Authentication events in authStore
16. Onboarding step tracking
17. Screen view tracking in navigation
18. Health integration events in step tracking service
19. Social events in friends store/screens
20. Group events in groups store/screens
21. Engagement events (pull to refresh, tabs, etc.)
22. Goal achievement events in steps store
23. Settings change events
24. Error tracking in API client

### Phase 5: User Properties
25. Set device/app properties on initialization
26. Update activity properties on changes
27. Update preference properties on settings changes

### Phase 6: Consent UI
28. Add consent prompt to onboarding
29. Add analytics settings in Settings screen
30. Implement data deletion functionality

### Phase 7: Testing
31. Unit tests for analytics service
32. Unit tests for milestone engine
33. Unit tests for consent manager
34. Integration tests for event tracking
35. Manual testing of all 54 events

## Dependencies

### New Packages Required
| Package | Justification |
|---------|---------------|
| `posthog-react-native` | Official PostHog SDK for React Native |

### Environment Variables Required
- `POSTHOG_API_KEY`: PostHog project API key
- `POSTHOG_HOST`: PostHog host URL (defaults to cloud)

## Tests

### Unit Tests
- Analytics service: track calls, identify, reset, consent enforcement
- Consent manager: state persistence, consent toggle
- Milestone engine: evaluation logic for all evaluator types
- Milestone definitions: validation of required fields

### Integration Tests
- Analytics initialization flow
- Consent prompt and storage
- Milestone achievement and event firing
- User property updates

### Manual Testing Checklist
- [ ] PostHog dashboard receives events
- [ ] User identification works correctly
- [ ] Session replay captures screens (if enabled)
- [ ] Feature flags load from PostHog
- [ ] Consent toggle stops/starts tracking
- [ ] All 54 events fire with correct properties
- [ ] All 12 user properties update correctly
- [ ] Milestone achievements trigger correct events

## Acceptance Criteria

### Core Analytics
- [ ] PostHog SDK initializes on app start
- [ ] All 54 events fire with correct properties
- [ ] All 12 user properties are tracked and updated
- [ ] Anonymous users tracked before login
- [ ] Anonymous-to-identified linking works on login
- [ ] Events stop firing when consent is revoked

### Milestone System
- [ ] Milestone definitions are configuration-driven
- [ ] Adding new milestones requires no engine code changes
- [ ] Milestones evaluate correctly on metric changes
- [ ] Non-repeatable milestones only fire once
- [ ] Repeatable milestones fire at each threshold
- [ ] Achieved milestones persist across app restarts

### GDPR Compliance
- [ ] Consent prompt shows during onboarding
- [ ] Consent state persists
- [ ] No events fire without consent
- [ ] "Delete my data" clears local analytics data
- [ ] User can revoke consent at any time

### Feature Flags
- [ ] Feature flags load from PostHog
- [ ] `useFeatureFlag` hook returns correct values

## Risks and Mitigations

1. **Bundle Size**: PostHog SDK adds approximately 200KB to bundle
   - Mitigation: Acceptable for analytics features provided

2. **Performance**: Analytics calls could impact UI performance
   - Mitigation: PostHog SDK batches events; configure appropriate flush intervals

3. **Privacy Regulations**: Different regions have different requirements
   - Mitigation: Consent-first approach; all tracking requires explicit consent

4. **Offline Behavior**: Events may be lost if user is offline
   - Mitigation: PostHog SDK queues events; verify queue persistence

## Decisions

1. **Session Replay**: Enable from day one with privacy masks (text inputs masked, images visible). Evaluate storage costs after initial rollout.

2. **Consent UI Placement**: Add consent prompt to onboarding flow for new users. Existing users will be prompted on first app launch after this update.

3. **Feature Flag Defaults**: Use safe defaults (features disabled) when PostHog is unreachable, unless a specific flag has an explicit default configured.

4. **Data Retention**: Configure 90-day retention in PostHog settings.

## Agent Assignment

| Phase | Agent | Estimated Effort |
|-------|-------|------------------|
| Phase 1-5 | Frontend Engineer | 2-3 days |
| Phase 6 | Frontend Engineer | 0.5 day |
| Phase 7 | Tester | 1 day |
| Review | Reviewer | 0.5 day |

**Total Estimated Effort**: 4-5 days

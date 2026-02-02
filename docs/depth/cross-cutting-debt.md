# Cross-cutting Technical Debt

**Date**: 2026-02-02
**Author**: Architecture Engineer Agent

---

## Summary

| Priority | Count |
|----------|-------|
| Critical | 1 |
| High | 2 |
| Medium | 3 |
| Low | 2 |
| **Total** | **8** |

---

## Critical Priority

### [CC-001] Missing Integration Tests

**Priority**: Critical
**Area**: Cross-cutting
**Effort**: Large

**What is it:**
The project has no integration tests that verify the full request/response cycle through the API. Current tests are unit tests only.

Test coverage:
- Backend: 42 unit test files for 136 source files (31% file coverage)
- Frontend: 102 test files for 163 source files (63% file coverage)
- Integration tests: 0

**Why it's debt:**
- Unit tests cannot catch integration issues
- API contracts not verified
- Database interactions not tested with real database
- RLS policies not tested in context
- Authentication flow not tested end-to-end
- Refactoring is risky without integration test safety net

**How to fix:**
1. Set up integration test project with test database
2. Create test fixtures for database seeding
3. Test critical user journeys:
   - Registration and login
   - Recording steps and viewing history
   - Sending/accepting friend requests
   - Creating and joining groups
4. Test RLS policies with different user contexts
5. Add to CI pipeline

**Files affected:**
- tests/ (new integration test project)
- CI/CD configuration
- docs/ (testing documentation)

---

## High Priority

### [CC-002] Test Coverage Gap Between Backend and Frontend

**Priority**: High
**Area**: Cross-cutting
**Effort**: Medium

**What is it:**
Backend and frontend have significant coverage gaps:

**Backend (needs more tests):**
- UserService has complex data export logic with minimal tests
- GroupService has 930 lines but only 3 test files
- ActivityService and ActivityRepository lack tests
- NotificationService lacks comprehensive tests

**Frontend (well-tested but gaps):**
- Store files have no direct tests (tested indirectly)
- API client functions tested minimally
- Custom hooks like useStepTracking need more tests

**Why it's debt:**
- Regression risk when modifying undertested code
- Cannot refactor with confidence
- Bugs caught late in development
- New developers hesitant to modify code

**How to fix:**
1. Prioritize testing business-critical paths:
   - Step sync logic
   - Group leaderboard calculations
   - Authentication flows
2. Add tests when fixing bugs (TDD for bug fixes)
3. Set coverage threshold in CI (e.g., 70%)
4. Track coverage trends over time

**Files affected:**
- tests/Stepper.UnitTests/ (add missing tests)
- Stepper.Mobile/src/store/__tests__/ (new test files)
- Stepper.Mobile/src/services/api/__tests__/ (expand tests)

---

### [CC-003] Missing Error Boundary Implementation

**Priority**: High
**Area**: Cross-cutting
**Effort**: Small

**What is it:**
The mobile app has no error boundaries to catch React rendering errors. Unhandled errors can crash the entire app.

**Why it's debt:**
- Single error can crash entire app
- Users see blank screens
- No error reporting for rendering issues
- Poor user experience on errors

**How to fix:**
1. Create ErrorBoundary component with fallback UI
2. Wrap app sections (navigation, screens) with boundaries
3. Integrate with PostHog analytics for error reporting
4. Show "Something went wrong" UI with retry option
5. Log errors for debugging

**Files affected:**
- Stepper.Mobile/src/components/common/ErrorBoundary.tsx (new)
- Stepper.Mobile/App.tsx
- Stepper.Mobile/src/navigation/RootNavigator.tsx

---

## Medium Priority

### [CC-004] Documentation Gaps

**Priority**: Medium
**Area**: Cross-cutting
**Effort**: Medium

**What is it:**
Several areas lack documentation:

1. **No ADRs** - Architecture Decision Records directory exists but is empty
2. **API changes** - No changelog for API modifications
3. **Deployment** - No deployment documentation
4. **Local setup** - README exists but lacks troubleshooting
5. **Database functions** - RPC functions not documented in API_REFERENCE.md

**Why it's debt:**
- Onboarding new developers is slow
- Decisions not captured for future reference
- Deployment is tribal knowledge
- Debugging issues takes longer

**How to fix:**
1. Create ADRs for key decisions:
   - API gateway pattern
   - Zustand for state management
   - Screaming Architecture adoption
2. Add API changelog (CHANGELOG.md)
3. Document deployment process
4. Add troubleshooting section to README
5. Document database functions in API_REFERENCE.md

**Files affected:**
- docs/architecture/decisions/ (ADR files)
- CHANGELOG.md (new)
- docs/DEPLOYMENT.md (new)
- README.md
- docs/API_REFERENCE.md

---

### [CC-005] No Feature Flags System

**Priority**: Medium
**Area**: Cross-cutting
**Effort**: Medium

**What is it:**
Features are shipped all-or-nothing. There's no way to:
- Gradually roll out features
- Disable features remotely if issues arise
- A/B test different implementations
- Ship incomplete features behind flags

The only flag mechanism is the `useFeatureFlag` hook which just returns `true`.

**Why it's debt:**
- Cannot do progressive rollouts
- No kill switch for buggy features
- A/B testing not possible
- Must ship complete features or nothing

**How to fix:**
1. Integrate PostHog feature flags (already using PostHog for analytics)
2. Create feature flag constants/enum
3. Update `useFeatureFlag` hook to check PostHog
4. Add feature flags for new features
5. Document feature flag lifecycle

**Files affected:**
- Stepper.Mobile/src/hooks/useFeatureFlag.ts
- PostHog dashboard configuration
- docs/ (feature flag documentation)

---

### [CC-006] Inconsistent Error Messages

**Priority**: Medium
**Area**: Cross-cutting
**Effort**: Small

**What is it:**
Error messages are inconsistent across the application:

**Backend:**
- Some use generic "An error occurred"
- Some expose exception messages (security risk)
- Some use friendly messages

**Frontend:**
- Uses `getErrorMessage` utility but still shows technical errors sometimes
- API errors may show internal details

**Why it's debt:**
- Inconsistent user experience
- Security risk from exposed internal errors
- Harder to support users with vague errors
- i18n difficult with hardcoded strings

**How to fix:**
1. Create error code enum/constants
2. Map error codes to user-friendly messages
3. Never expose exception messages to users
4. Log technical details server-side
5. Add error message translations (i18n ready)
6. Create error message catalog

**Files affected:**
- All controller files
- Stepper.Mobile/src/utils/errorUtils.ts
- New error constants file

---

## Low Priority

### [CC-007] No Health Check Endpoint

**Priority**: Low
**Area**: Cross-cutting
**Effort**: Small

**What is it:**
The API has no health check endpoint for monitoring:
- No `/health` or `/ready` endpoint
- Cannot verify API is responsive
- No database connectivity check
- Load balancers cannot verify instance health

**Why it's debt:**
- Deployment verification is manual
- Cannot automate health monitoring
- Load balancers need health endpoints
- Kubernetes readiness/liveness probes not possible

**How to fix:**
1. Add `/health` endpoint (simple 200 OK)
2. Add `/ready` endpoint (checks database connectivity)
3. Include version information in response
4. Document endpoints for ops team

**Files affected:**
- Stepper.Api/Common/HealthController.cs (new)
- Stepper.Api/Program.cs

---

### [CC-008] No Rate Limiting

**Priority**: Low
**Area**: Cross-cutting
**Effort**: Medium

**What is it:**
The API has no rate limiting implementation:
- No protection against abuse
- No per-user request limits
- No brute force protection on auth endpoints

Note: Supabase Auth has built-in rate limiting, but custom endpoints don't.

**Why it's debt:**
- Vulnerable to denial of service
- No protection against scraping
- Auth endpoints could be brute forced
- API costs could spike from abuse

**How to fix:**
1. Add ASP.NET Core rate limiting middleware
2. Configure per-endpoint limits
3. Add stricter limits for auth endpoints
4. Return 429 Too Many Requests when exceeded
5. Add rate limit headers to responses
6. Consider Redis for distributed rate limiting

**Files affected:**
- Stepper.Api/Program.cs
- Stepper.Api/Common/RateLimitingConfiguration.cs (new)

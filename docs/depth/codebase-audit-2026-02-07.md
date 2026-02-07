# Comprehensive Codebase Audit

**Date**: 2026-02-07
**Model**: Claude Opus 4.6
**Branch**: `feature/deep-codebase-audit`
**Previous Audit**: 2026-02-02 (Waves 1-5 completed since then)

---

## Executive Summary

| Area | Score | Status |
|------|-------|--------|
| Backend Code Quality | 9.2/10 | Excellent |
| Frontend Code Quality | 7.0/10 | Good with significant DRY violations |
| Backend Test Coverage | 100% unit / ~30% integration | Excellent unit, limited integration |
| Frontend Test Coverage | ~65% | Critical gaps in core features |
| Infrastructure | Good | No CI/CD, no linting config |
| Architecture Compliance | 10/10 | Perfect Screaming Architecture |

**Total new issues found: 41** (1 security concern verified as non-issue)

| Severity | Backend | Frontend | Tests | Infrastructure | Total |
|----------|---------|----------|-------|----------------|-------|
| Critical | 0 | 0 | 3 | 0 | 3 |
| High | 0 | 5 | 2 | 2 | 9 |
| Medium | 2 | 11 | 3 | 3 | 19 |
| Low | 3 | 6 | 0 | 1 | 10 |

---

## Issue Catalog

### Critical Issues

| ID | Area | Issue | Impact |
|----|------|-------|--------|
| ~~SEC-001~~ | ~~Infra~~ | ~~.env credentials~~ - **VERIFIED: `.env` is in `.gitignore` and was never committed** | Not an issue |
| TC-001 | Tests | Step tracking services have 0% test coverage (3 files) | Core feature untested |
| TC-002 | Tests | HomeScreen has no tests (main dashboard) | Primary screen untested |
| TC-003 | Tests | Database RLS policies never tested in integration tests | Security verification gap |

### High Issues

| ID | Area | Issue | Impact |
|----|------|-------|--------|
| FE-H01 | Frontend | Duplicated StatCard component (home vs profile) | Maintenance burden |
| FE-H02 | Frontend | InviteCodeDialog rendered 3 times in GroupsListScreen (117 lines dup) | Code duplication |
| FE-H03 | Frontend | StepsHistoryScreen is 491 lines with 11 handlers + 6 state vars | Untestable complexity |
| FE-H04 | Frontend | Repeated store error handling pattern (20+ occurrences, ~250 lines) | Consistency risk |
| FE-H05 | Frontend | Repeated loading/error state rendering across 8+ screens (~500 lines) | Massive duplication |
| TC-H01 | Tests | 6 onboarding screens have 0 tests | First-time UX untested |
| TC-H02 | Tests | Health services (3 files) have 0% test coverage | Platform integration untested |
| INF-H01 | Infra | No CI/CD automation (no GitHub Actions) | No quality gates |
| INF-H02 | Infra | No code linting/formatting config (.editorconfig, eslint, prettier) | Inconsistency risk |

### Medium Issues

| ID | Area | Issue | Impact |
|----|------|-------|--------|
| BE-M01 | Backend | Controller auth check repeated ~55 times across 7 controllers (~200 lines) | DRY violation |
| BE-M02 | Backend | UserService has 9 dependencies and 7+ concerns (860 lines) | SRP concern |
| FE-M01 | Frontend | Magic numbers throughout (93+ files use raw `16`, `88`, `200`, etc.) | Readability |
| FE-M02 | Frontend | Magic route names hardcoded as strings in 30+ files | Runtime crash risk |
| FE-M03 | Frontend | Duplicate `getFriends`/`getFriendsWithSteps` API methods (identical code) | Dead code |
| FE-M04 | Frontend | console.log/warn in production code (26+ files) | Performance, security |
| FE-M05 | Frontend | 8 TODO comments for unimplemented features (report/block user, achievements) | Incomplete features |
| FE-M06 | Frontend | Repeated date formatting functions across files | DRY violation |
| FE-M07 | Frontend | Repeated API response mapping logic (friendsApi, groupsApi) | DRY violation |
| FE-M08 | Frontend | `useHomeData` hook return type not exported | TypeScript quality |
| FE-M09 | Frontend | Unsafe error type narrowing in friendsApi (line 242) | Type safety |
| FE-M10 | Frontend | Silent error handling with console.warn in groupsApi (line 176) | User gets broken UI |
| FE-M11 | Frontend | Session expiration callback weakly typed (optional `?.`) | Auth edge case |
| TC-M01 | Tests | Frontend hooks only 57% covered (missing useStepTracking, useHomeData, useChartData) | Logic untested |
| TC-M02 | Tests | Frontend utilities 0% covered (6 files: errorUtils, groupUtils, navigation, etc.) | Helpers untested |
| TC-M03 | Tests | Milestone engine untested | Feature logic gap |
| INF-M01 | Infra | Rate limit config hardcoded in Program.cs (not in appsettings) | Config inflexibility |
| INF-M02 | Infra | Missing deployment documentation | Ops gap |
| INF-M03 | Infra | Build artifacts (bin/obj) tracked in git | Repo bloat |

### Low Issues

| ID | Area | Issue | Impact |
|----|------|-------|--------|
| BE-L01 | Backend | `ValidateUserId` duplicated in 5+ services | Minor DRY violation |
| BE-L02 | Backend | MinPasswordLength = 6 (below modern recommendation of 8+) | Minor security |
| BE-L03 | Backend | Token storage in HttpContext.Items undocumented | Developer clarity |
| FE-L01 | Frontend | Repeated FAB positioning code in 7 screens | Minor DRY |
| FE-L02 | Frontend | Repeated `listContent` padding in 6+ screens | Minor DRY |
| FE-L03 | Frontend | Inconsistent type naming (BackendX vs X, snake_case vs camelCase mixing) | Convention drift |
| FE-L04 | Frontend | Unreachable code pattern in EditProfileScreen handleOpenMenu | Code clarity |
| FE-L05 | Frontend | Unnecessary `paginatedHistoryPage` state (derivable from array length) | State bloat |
| FE-L06 | Frontend | Dead styles in some component StyleSheet definitions | Unused code |
| INF-L01 | Infra | `nul` artifact file in repo root | Repo cleanliness |

---

## Detailed Findings by Area

### 1. Backend

The backend is in excellent shape. Architecture compliance is perfect (Screaming Architecture with vertical slices). SOLID principles are well-followed, with all dependencies properly inverted to abstractions. Every service uses `ArgumentNullException.ThrowIfNull()` consistently. Zero magic numbers (all constants named). Zero dead code. Comprehensive XML documentation.

**BE-M01: Controller Auth Check Duplication**

Every controller method repeats this pattern:
```csharp
var userId = User.GetUserId();
if (userId == null)
{
    return Unauthorized(ApiResponse<T>.ErrorResponse("User is not authenticated."));
}
```

Found 55+ times across 7 controllers. Recommend extracting to a base controller method or action filter.

**BE-M02: UserService Complexity**

`UserService.cs` (860 lines) handles: profile management, preferences, avatar upload, statistics aggregation, data export, activity calculation, and mutual groups. Has 9 constructor dependencies. Consider splitting into `ProfileService` and `DataExportService` in a future refactor.

---

### 2. Frontend

The frontend has solid foundations (Zustand, TypeScript, React Native Paper) but significant DRY violations and component complexity issues.

**FE-H01: Duplicate StatCard**
- `src/screens/home/components/StatCard.tsx` (82 lines) - uses `title`/`subtitle` props
- `src/screens/profile/components/StatCard.tsx` (78 lines) - uses `label`/`onPress` props
- Fix: Create unified `src/components/common/StatCard.tsx` with combined interface

**FE-H02: Triple InviteCodeDialog**
In `GroupsListScreen.tsx`, the exact same 39-line dialog block appears 3 times (loading state, error state, main render). Fix: Extract to `InviteCodeDialog` component, render once at the end.

**FE-H03: StepsHistoryScreen Complexity**
491 lines, 11 event handlers, 6+ state variables, chart navigation + date picker + pagination + manual entry all in one component. Fix: Break into `ChartSection`, `HistorySection`, and custom hooks.

**FE-H04: Repeated Store Error Handling**
Every store action follows the same try/catch/set pattern 20+ times:
```typescript
set({ isLoading: true, error: null });
try {
  const response = await api.method();
  set({ data: response, isLoading: false });
} catch (error) {
  set({ error: getErrorMessage(error), isLoading: false });
}
```
Fix: Create `createAsyncAction` utility.

**FE-H05: Repeated Screen Layout Pattern**
8+ screens duplicate the same loading/error/header/searchbar rendering. Fix: Create `ScreenLayout` wrapper component.

**FE-M02: Magic Route Names**
30+ files use hardcoded route strings like `navigation.navigate('GroupDetail', { groupId })`. Fix: Create `ROUTE_NAMES` constants object for compile-time safety.

**FE-M03: Duplicate API Method**
`friendsApi.ts` has both `getFriends()` and `getFriendsWithSteps()` - identical implementations with a comment admitting they're the same. Fix: Remove `getFriendsWithSteps`.

---

### 3. Test Coverage

**Backend: Excellent (100% unit)**
All 8 controllers, 8 services, 9 repositories, and 5 middleware/common utilities have comprehensive tests. Test quality is high with proper AAA pattern, FluentAssertions, boundary testing, and error path coverage. GroupServiceTests.cs alone has 1,456 lines with 56+ scenarios.

**Frontend: Gaps in Critical Areas**

| Category | Covered | Total | % |
|----------|---------|-------|---|
| Screens | 26 | 30 | 87% |
| Components | 32 | 32 | 100% |
| Hooks | 4 | 7 | 57% |
| Stores | 8 | 8 | 100% |
| API Services | 9 | 10 | 90% |
| Health Services | 0 | 3 | 0% |
| Step Tracking Services | 0 | 3 | 0% |
| Utilities | 0 | 6 | 0% |
| E2E | 0 | - | 0% |

**Critical test gaps:**
- `HomeScreen.tsx` - Main user-facing dashboard, no test
- `useStepTracking.ts` - Orchestrates all background step sync, no test
- `unifiedStepTrackingService.ts`, `backgroundSyncTask.ts`, `syncStateManager.ts` - 0 tests
- 6 onboarding screens - 0 tests (first-time user experience)
- Database RLS policies - never tested in integration tests

---

### 4. Infrastructure

**~~SEC-001~~: .env Credentials - NOT AN ISSUE**
Verified: `.env` is properly listed in `.gitignore` (line 101) and was never committed to git history. No credential exposure.

**INF-H01: No CI/CD**
No GitHub Actions or other CI pipelines. Tests only run manually. No automated quality gates.

**INF-H02: No Linting/Formatting Config**
No `.editorconfig`, no ESLint config, no Prettier config. Code formatting is maintained by convention only.

---

## Recommended Action Plan

### Phase 1: Cleanup (Immediate)
1. ~~Rotate Supabase credentials~~ - Verified: `.env` never committed
2. Remove `nul` artifact and build artifacts from git

### Phase 2: Test Coverage (1-2 weeks)
1. Add HomeScreen tests
2. Add step tracking service tests (3 files)
3. Add useStepTracking hook test
4. Add onboarding screen tests (6 screens)
5. Add health service tests (3 files)

### Phase 3: Frontend DRY Cleanup (1-2 weeks)
1. Create unified StatCard component
2. Extract InviteCodeDialog component
3. Create ScreenLayout wrapper (eliminates ~500 lines)
4. Create store async utility (eliminates ~250 lines)
5. Create route name constants
6. Remove duplicate getFriendsWithSteps
7. Extract spacing/dimension constants

### Phase 4: Backend Refinement (1 week)
1. Extract controller auth check to base class or filter
2. Document UserService design decision (or split if agreed)

### Phase 5: Infrastructure (1 week)
1. Add GitHub Actions CI (build + test for both backend and frontend)
2. Add .editorconfig, ESLint, Prettier configs
3. Move rate limit config to appsettings.json
4. Add deployment documentation

---

## Relationship to Previous Audit

The previous audit (2026-02-02) identified 39 items across Waves 1-5. All 5 waves have been completed per git history. This new audit identifies 42 additional items, primarily:
- Frontend DRY violations not previously tracked
- Detailed test coverage gap analysis
- Infrastructure security concern (.env)
- Specific component complexity issues with line-level detail

Items that overlap with the previous audit (e.g., FE-001 TODO comments, CC-001 missing integration tests) are noted but given fresh analysis with updated context.

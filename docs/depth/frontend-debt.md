# Frontend Technical Debt

**Date**: 2026-02-02
**Author**: Architecture Engineer Agent

---

## Summary

| Priority | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 5 |
| Low | 4 |
| **Total** | **11** |

---

## High Priority

### [FE-001] TODO Comments for Unimplemented Features

**Priority**: High
**Area**: Frontend
**Effort**: Medium

**What is it:**
Multiple TODO comments indicate features that are not yet implemented but are referenced in the UI:

1. `UserProfileScreen.tsx:73` - "TODO: Add accepted_at to friendship status response"
2. `UserProfileScreen.tsx:192` - "TODO: Implement report user API"
3. `UserProfileScreen.tsx:211` - "TODO: Implement block user API"
4. `usersApi.ts:316` - "TODO: Backend doesn't provide is_private yet"
5. `usersApi.ts:350` - "TODO: Implement achievements table and logic"
6. `PermissionsScreen.tsx:56` - "TODO: Send token to backend when endpoint is ready"
7. `supabase.ts:43` - TODO for full backend auth integration

**Why it's debt:**
- Users may see UI elements for non-functional features
- Incomplete feature flags/hiding
- Some hardcoded values (is_private: false) may be incorrect
- Could confuse users or cause unexpected behavior

**How to fix:**
1. For each TODO, decide: implement, hide UI, or remove feature
2. Report/Block user: Either implement backend APIs or hide these options
3. is_private: Implement backend field or use user_preferences table
4. achievements: Either implement or remove from UI
5. Track remaining TODOs in backlog

**Files affected:**
- Stepper.Mobile/src/screens/friends/UserProfileScreen.tsx
- Stepper.Mobile/src/services/api/usersApi.ts
- Stepper.Mobile/src/screens/onboarding/PermissionsScreen.tsx
- Stepper.Mobile/src/services/supabase.ts

---

### [FE-002] Hard-coded Start Date in History Query

**Priority**: High
**Area**: Frontend
**Effort**: Small

**What is it:**
The `fetchPaginatedHistory` function uses '1970-01-01' as the start date to fetch "all" history data.

```typescript
const startDate = '1970-01-01';
const endDate = getTodayString();
```

**Why it's debt:**
- Magic date in code
- Fetches potentially massive amounts of data
- No pagination at DB level (all data fetched, then paginated in memory)
- Performance issue for users with years of data

**How to fix:**
1. Implement server-side pagination in the backend
2. Pass page/pageSize to backend API instead of date range
3. Remove the full history caching approach
4. Use cursor-based pagination for efficiency

**Files affected:**
- Stepper.Mobile/src/store/stepsStore.ts

---

## Medium Priority

### [FE-003] Inline Styles and Magic Numbers

**Priority**: Medium
**Area**: Frontend
**Effort**: Medium

**What is it:**
Screens contain inline styles with magic numbers:

- `paddingBottom: 88` (space for FAB)
- `fontSize: 28` (icon sizes)
- `marginTop: 24` (spacing values)
- Various hardcoded colors and dimensions

**Why it's debt:**
- Difficult to maintain consistent spacing
- Changes require finding all instances
- Not responsive to different screen sizes
- Some values may not match design system

**How to fix:**
1. Create a spacing scale in theme (e.g., spacing.sm, spacing.md, spacing.lg)
2. Move repeated values to theme constants
3. Document the design system values
4. Use theme values instead of magic numbers

**Files affected:**
- Most screen files in Stepper.Mobile/src/screens/
- Stepper.Mobile/src/theme/theme.ts

---

### [FE-004] Empty Handler in GroupDetailScreen

**Priority**: Medium
**Area**: Frontend
**Effort**: Small

**What is it:**
The `handleMemberPress` callback in `GroupDetailScreen.tsx` is empty:

```typescript
const handleMemberPress = useCallback((entry: LeaderboardEntry) => {
  // Navigate to member profile
  // For now, we don't have a profile screen in GroupsStack
  // This would typically navigate to a UserProfile screen
}, []);
```

**Why it's debt:**
- User can tap leaderboard items with no response
- Poor user experience (dead interaction)
- Comments indicate missing navigation

**How to fix:**
1. Implement navigation to UserProfileScreen
2. Or remove onPress handler to indicate non-interactive items
3. Or show a toast/modal with user info

**Files affected:**
- Stepper.Mobile/src/screens/groups/GroupDetailScreen.tsx

---

### [FE-005] Duplicate Store Patterns

**Priority**: Medium
**Area**: Frontend
**Effort**: Medium

**What is it:**
All Zustand stores follow the same pattern with repeated boilerplate:
- `isLoading`, `error` state
- Error handling with `getErrorMessage`
- Similar action patterns

**Why it's debt:**
- Code duplication across 8 store files
- Changes to patterns require updating all stores
- Inconsistent error handling if someone forgets pattern

**How to fix:**
1. Create base store utilities for common patterns
2. Consider creating higher-order store functions
3. Extract error handling to shared utility
4. Use a store factory pattern for CRUD operations

**Files affected:**
- Stepper.Mobile/src/store/authStore.ts
- Stepper.Mobile/src/store/stepsStore.ts
- Stepper.Mobile/src/store/friendsStore.ts
- Stepper.Mobile/src/store/groupsStore.ts
- Stepper.Mobile/src/store/notificationsStore.ts
- Stepper.Mobile/src/store/activityStore.ts
- Stepper.Mobile/src/store/userStore.ts
- Stepper.Mobile/src/store/analyticsStore.ts

---

### [FE-006] API Client Imports Zustand Store Directly

**Priority**: Medium
**Area**: Frontend
**Effort**: Medium

**What is it:**
The API client (`client.ts`) directly imports and uses `useAuthStore`:

```typescript
import { useAuthStore } from '../../store/authStore';
// ...
useAuthStore.getState().setUser(null);
```

**Why it's debt:**
- Creates circular dependency risk
- API layer should not know about state management
- Makes the API client harder to test
- Tight coupling between layers

**How to fix:**
1. Use event emitter pattern for auth state changes
2. Or pass callbacks to API client during initialization
3. Or use a service locator pattern for auth state
4. Keep API client as pure HTTP layer

**Files affected:**
- Stepper.Mobile/src/services/api/client.ts

---

### [FE-007] Large Screen Components

**Priority**: Medium
**Area**: Frontend
**Effort**: Medium

**What is it:**
Some screen components are large (300+ lines) and contain multiple concerns:
- `GroupDetailScreen.tsx` - 433 lines
- `HomeScreen.tsx` - 288 lines
- `UserProfileScreen.tsx` - 400+ lines

**Why it's debt:**
- Harder to understand and maintain
- Mixed presentation and logic concerns
- Difficult to reuse parts of the UI
- Testing requires full component setup

**How to fix:**
1. Extract custom hooks for data fetching logic
2. Extract sub-components for distinct UI sections
3. Consider container/presenter pattern
4. Keep screens as orchestrators, not implementers

**Files affected:**
- Stepper.Mobile/src/screens/groups/GroupDetailScreen.tsx
- Stepper.Mobile/src/screens/home/HomeScreen.tsx
- Stepper.Mobile/src/screens/friends/UserProfileScreen.tsx

---

## Low Priority

### [FE-008] Emoji in Code

**Priority**: Low
**Area**: Frontend
**Effort**: Small

**What is it:**
Some components use emoji characters directly in JSX:

```typescript
<Text style={styles.groupIcon}>{'\u{1F3C6}'}</Text>
```

**Why it's debt:**
- Unicode escapes are not readable
- Emojis could display differently across platforms
- Better to use icon libraries for consistent display

**How to fix:**
1. Replace with react-native-paper icons where possible
2. Create constants for emojis with meaningful names
3. Consider using an icon font for custom icons

**Files affected:**
- Stepper.Mobile/src/screens/groups/GroupDetailScreen.tsx
- Various components using emojis

---

### [FE-009] Inconsistent Navigation Patterns

**Priority**: Low
**Area**: Frontend
**Effort**: Small

**What is it:**
Navigation between tabs uses verbose patterns:

```typescript
navigation.getParent()?.getParent()?.navigate('Tabs', { screen: 'SettingsTab' });
```

**Why it's debt:**
- Complex nested navigation calls
- Fragile if navigation structure changes
- Hard to understand for new developers

**How to fix:**
1. Create navigation utility functions
2. Use navigation state management
3. Document the navigation hierarchy
4. Consider flatter navigation structure

**Files affected:**
- Stepper.Mobile/src/screens/home/HomeScreen.tsx
- Various screens with cross-tab navigation

---

### [FE-010] Missing Error Boundaries

**Priority**: Low
**Area**: Frontend
**Effort**: Small

**What is it:**
No React error boundaries are implemented to catch and handle component errors gracefully.

**Why it's debt:**
- Unhandled errors crash the entire app
- No graceful degradation
- Users see blank screens on errors

**How to fix:**
1. Create ErrorBoundary component
2. Wrap main app sections with error boundaries
3. Implement error reporting to analytics
4. Show user-friendly error screens

**Files affected:**
- Stepper.Mobile/App.tsx
- Stepper.Mobile/src/navigation/RootNavigator.tsx

---

### [FE-011] Test Files Import from Relative Paths

**Priority**: Low
**Area**: Frontend
**Effort**: Small

**What is it:**
Test files sometimes use relative imports instead of path aliases, creating inconsistency with source files.

**Why it's debt:**
- Inconsistent import style
- Harder to move test files
- Different patterns for tests vs source

**How to fix:**
1. Update Jest config to support path aliases
2. Update test files to use aliases
3. Document import conventions

**Files affected:**
- Various test files in Stepper.Mobile/src/**/__tests__/

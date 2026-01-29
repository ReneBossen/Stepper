# Code Review: Google Authentication Implementation

**Plan**: Not formally planned - Implemented as extension to `docs/plans/10_UI_AuthScreens.md`
**Iteration**: 1
**Date**: 2026-01-18
**Reviewer**: Claude Sonnet 4.5

## Summary

The Google Authentication implementation adds OAuth sign-in capability to the existing auth screens. The implementation includes two approaches: a **browser-based OAuth flow** (currently used in LoginScreen) and an **expo-auth-session based flow** (implemented in useGoogleAuth hook but unused). While the code is **functional and well-tested**, there are **critical architectural and security concerns** that must be addressed before production deployment.

**Files Modified:**
- `src/screens/auth/LoginScreen.tsx` - Added Google Sign-In button and OAuth handler
- `src/services/supabase.ts` - Added `signInWithGoogleOAuth()` and `signInWithIdToken()`
- `src/store/authStore.ts` - Has existing `signInWithGoogle` action (for ID token flow)
- `src/hooks/useGoogleAuth.ts` - **UNUSED** custom hook with expo-auth-session
- `app.json` - Added expo-web-browser plugin
- `.env.example` - Added GOOGLE_WEB_CLIENT_ID

**Test Coverage:**
- `src/services/__tests__/supabase.test.ts` - 49 tests (all passing)
- `src/hooks/__tests__/useGoogleAuth.test.ts` - 43 tests (all passing)
- `src/screens/auth/__tests__/LoginScreen.test.tsx` - 18 Google auth tests (all failing due to React Native Paper mocking issues, not implementation bugs)

## Checklist Results

### Architecture Compliance
- [x] Follows vertical slice architecture
- [ ] **BLOCKER**: Unused code present (`useGoogleAuth` hook not integrated)
- [ ] **BLOCKER**: Two conflicting authentication approaches implemented
- [x] Clean separation of concerns (UI → Service → Supabase)
- [x] No business logic in screen components
- [x] Proper dependency direction

### Code Quality
- [x] Follows TypeScript and React Native best practices
- [x] Proper error handling with user alerts
- [ ] **MAJOR**: Magic strings in URL parsing logic
- [ ] **MAJOR**: No input validation on URL parameters
- [x] Clear naming conventions
- [x] Type safety throughout

### Plan Adherence
- [ ] **BLOCKER**: No formal plan exists for Google authentication feature
- [x] Original plan (10_UI_AuthScreens.md) marked Google auth as "future feature"
- [ ] Scope creep - feature implemented without plan approval
- [x] Implementation quality is good despite missing plan

### Testing
- [x] Comprehensive test coverage (110 tests total)
- [x] All service layer tests pass (49/49)
- [x] All hook tests pass (43/43)
- [ ] Component tests fail due to mocking issues (not implementation bugs)
- [x] Tests are deterministic
- [x] Edge cases covered

### Security
- [ ] **BLOCKER**: Manual token extraction from URL fragment vulnerable to manipulation
- [ ] **BLOCKER**: No validation of token format or source
- [ ] **MAJOR**: Tokens logged to console in error handler (line 63)
- [ ] **MAJOR**: No session validation after manual setSession
- [x] Uses Supabase secure storage
- [x] HTTPS enforced via Supabase

## Issues

### BLOCKER

#### Issue #1: Unused Code - useGoogleAuth Hook
**File**: `src/hooks/useGoogleAuth.ts` (67 lines)
**Description**: A complete Google authentication hook using `expo-auth-session` is implemented and fully tested (43 passing tests) but **never imported or used** in the application. Meanwhile, LoginScreen implements Google auth inline with a completely different approach (browser-based OAuth).

**Impact**:
- Code maintenance burden with duplicate functionality
- Confusion about which approach is the "correct" one
- Wasted development and testing effort
- Violates DRY principle
- 67 lines of dead code + 534 lines of tests for unused code

**Suggestion**: Choose one approach and remove the other:

**Option A - Use expo-auth-session (Recommended):**
```typescript
// In LoginScreen.tsx
import { useGoogleAuth } from './hooks/useGoogleAuth';

const { signInWithGoogle, isLoading: isGoogleLoading, error: googleError } = useGoogleAuth();
const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

const handleGoogleSignIn = async () => {
  const tokens = await signInWithGoogle();
  if (tokens?.idToken) {
    await signInWithGoogle(tokens.idToken, tokens.accessToken);
  }
};
```

**Option B - Remove unused hook:**
- Delete `src/hooks/useGoogleAuth.ts`
- Delete `src/hooks/__tests__/useGoogleAuth.test.ts`
- Keep current browser-based implementation

**Rationale**: Option A is architecturally cleaner as it separates concerns (hook handles OAuth, screen handles UI). The expo-auth-session approach is more maintainable and follows React patterns.

#### Issue #2: No Formal Plan for Google Authentication
**File**: N/A
**Description**: Google authentication was implemented without an approved plan. The original Plan 10 specifically marked "Continue with Google" as a "future feature" (line 121). This violates the policy that "every change must trace back to an approved plan" (contract.md).

**Impact**:
- Breaks traceability requirement
- No documented requirements or acceptance criteria
- No architectural review before implementation
- Risk of misaligned expectations with user needs

**Suggestion**:
1. **STOP** further development on this feature
2. Create `docs/plans/11_GoogleAuth.md` documenting:
   - Requirements and user stories
   - OAuth flow architecture
   - Security considerations
   - Error handling strategy
   - Which implementation approach to use
   - Acceptance criteria
3. Get user approval on plan
4. Resume implementation following approved plan

#### Issue #3: Manual Token Extraction Security Vulnerability
**File**: `src/screens/auth/LoginScreen.tsx`
**Lines**: 39-58
**Description**: The implementation manually parses tokens from the URL fragment and calls `supabase.auth.setSession()` without any validation. This is **dangerous** and bypasses Supabase's built-in security checks.

**Security Risks**:
1. **No token validation**: Tokens could be malformed, expired, or forged
2. **No signature verification**: Anyone could construct a URL with fake tokens
3. **No source verification**: No check that tokens came from Google
4. **Session hijacking risk**: Malicious URL could inject arbitrary tokens

**Current Code:**
```typescript
// UNSAFE: No validation!
const params = new URLSearchParams(fragment);
const accessToken = params.get('access_token');
const refreshToken = params.get('refresh_token');

if (accessToken && refreshToken) {
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}
```

**Suggestion**: Let Supabase handle the OAuth callback automatically instead of manual parsing:

```typescript
// In supabase.ts - Configure to handle OAuth callbacks automatically
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Changed to true
  },
});

// In LoginScreen.tsx - Simplified handler
const handleGoogleSignIn = async () => {
  setIsGoogleLoading(true);
  try {
    const { url } = await signInWithGoogleOAuth();
    if (url) {
      // Supabase will handle the callback automatically
      await WebBrowser.openAuthSessionAsync(url, 'Stepper://');
      // Session is set automatically by detectSessionInUrl
    }
  } catch (err: any) {
    console.error('Google sign-in error:', err);
    Alert.alert('Sign In Error', err.message || 'Failed to sign in with Google');
  } finally {
    setIsGoogleLoading(false);
  }
};
```

**Alternative**: If manual handling is required, validate tokens:
```typescript
if (accessToken && refreshToken) {
  // Verify token format (JWT structure)
  const isValidToken = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(accessToken);

  if (!isValidToken) {
    throw new Error('Invalid token format');
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error; // Supabase validation failed
  }

  // Verify session was actually created
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Failed to create session');
  }
}
```

#### Issue #4: Conflicting OAuth Configuration
**File**: `src/services/supabase.ts`
**Lines**: 114-125
**Description**: The `signInWithGoogleOAuth` function configures OAuth with `skipBrowserRedirect: true` and `redirectTo: undefined`, which conflicts with the manual token extraction approach in LoginScreen.

**Problem**:
```typescript
export const signInWithGoogleOAuth = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      skipBrowserRedirect: true, // Prevents auto-redirect
      redirectTo: undefined,     // No redirect URL specified
    },
  });
  // ...
};
```

With `skipBrowserRedirect: true`, Supabase expects the client to handle the OAuth flow manually, but there's no proper redirect URL configuration.

**Suggestion**: Configure OAuth properly for mobile:
```typescript
export const signInWithGoogleOAuth = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'Stepper://', // Explicit redirect URL
      // skipBrowserRedirect defaults to false - let Supabase handle it
    },
  });

  if (error) throw error;
  return data;
};
```

### MAJOR

#### Issue #5: Unused authStore.signInWithGoogle Action
**File**: `src/store/authStore.ts`
**Lines**: 73-90
**Description**: The `authStore` has a `signInWithGoogle` action that calls `signInWithIdToken`, but this action is **never called** in the application. The LoginScreen implements Google auth directly without going through the store.

**Impact**:
- Inconsistent architecture (email/password uses store, Google doesn't)
- State management bypassed for Google auth
- Duplicate code paths for authentication
- Store's `isLoading` state not updated for Google auth

**Suggestion**: Use the store action consistently:
```typescript
// In LoginScreen.tsx
const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

const handleGoogleSignIn = async () => {
  setIsGoogleLoading(true);
  try {
    const { signInWithGoogle: getTokens } = useGoogleAuth();
    const tokens = await getTokens();

    if (tokens?.idToken) {
      await signInWithGoogle(tokens.idToken, tokens.accessToken);
    }
  } catch (err: any) {
    Alert.alert('Sign In Error', err.message || 'Failed to sign in with Google');
  } finally {
    setIsGoogleLoading(false);
  }
};
```

This ensures consistent state management across all authentication methods.

#### Issue #6: Token Exposure in Console Logs
**File**: `src/screens/auth/LoginScreen.tsx`
**Line**: 63
**Description**: Errors are logged to console, which may expose sensitive token information in error messages.

**Current Code:**
```typescript
} catch (err: any) {
  console.error('Google sign-in error:', err); // May log tokens
  Alert.alert('Sign In Error', err.message || 'Failed to sign in with Google');
}
```

**Suggestion**: Sanitize error logs:
```typescript
} catch (err: any) {
  // Log only error type and message, not full error object
  console.error('Google sign-in error:', err.message || 'Unknown error');
  Alert.alert('Sign In Error', err.message || 'Failed to sign in with Google');
}
```

#### Issue #7: No Loading State Synchronization
**File**: `src/screens/auth/LoginScreen.tsx`
**Lines**: 18, 143-144
**Description**: Google auth uses local state `isGoogleLoading` while email/password auth uses hook's `isLoading`. The button disable logic combines both, but this is inconsistent.

**Current Code:**
```typescript
const [isGoogleLoading, setIsGoogleLoading] = useState(false);
const { isLoading, ... } = useLogin();

// Button disabled when either is loading
disabled={isLoading || isGoogleLoading}
```

**Impact**:
- Inconsistent state management patterns
- No global loading state for Google auth
- UI state scattered across hook and component

**Suggestion**: Create a `useGoogleSignIn` hook similar to `useLogin`:
```typescript
// src/screens/auth/hooks/useGoogleSignIn.ts
export const useGoogleSignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { url } = await signInWithGoogleOAuth();
      if (url) {
        const result = await WebBrowser.openAuthSessionAsync(url, 'Stepper://');
        // Handle result...
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return { handleGoogleSignIn, isLoading, error };
};
```

#### Issue #8: Magic Strings in URL Parsing
**File**: `src/screens/auth/LoginScreen.tsx`
**Lines**: 44, 49-50
**Description**: Token parameter names are hardcoded as magic strings without constants.

**Current Code:**
```typescript
const accessToken = params.get('access_token');
const refreshToken = params.get('refresh_token');
```

**Suggestion**: Define constants:
```typescript
// In src/services/supabase.ts or constants file
export const OAUTH_PARAMS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// In LoginScreen.tsx
const accessToken = params.get(OAUTH_PARAMS.ACCESS_TOKEN);
const refreshToken = params.get(OAUTH_PARAMS.REFRESH_TOKEN);
```

### MINOR

#### Issue #9: Inconsistent Error Handling
**File**: `src/screens/auth/LoginScreen.tsx`
**Lines**: 62-67
**Description**: Google auth uses `Alert.alert()` for errors while the email/password flow displays errors inline via `AuthErrorMessage` component.

**Impact**: Inconsistent UX - some errors shown as alerts, others inline

**Suggestion**: Use consistent error display:
```typescript
// Option 1: Show Google errors inline (recommended)
const [googleError, setGoogleError] = useState<string | null>(null);

// After AuthErrorMessage for email/password
{googleError && <AuthErrorMessage error={googleError} />}

// In catch block
setGoogleError(err.message || 'Failed to sign in with Google');

// Option 2: Use alerts for all errors (less preferred)
// Move all error display to Alert.alert()
```

#### Issue #10: Missing Deep Link Configuration for iOS
**File**: `app.json`
**Lines**: 16-18
**Description**: iOS configuration lacks associated domains for universal links, which are needed for production OAuth redirects.

**Current Config:**
```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.Stepper.mobile"
}
```

**Suggestion**: Add associated domains:
```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.Stepper.mobile",
  "associatedDomains": [
    "applinks:Stepper.com"
  ]
}
```

#### Issue #11: No Error Boundary for OAuth Flow
**File**: `src/screens/auth/LoginScreen.tsx`
**Description**: No protection against uncaught errors in async OAuth flow

**Suggestion**: Add error boundary or wrap in try-catch at component level:
```typescript
// In parent component or RootNavigator
<ErrorBoundary fallback={<ErrorScreen />}>
  <AuthNavigator />
</ErrorBoundary>
```

#### Issue #12: Redundant Environment Variable
**File**: `.env.example`
**Lines**: 12-13
**Description**: Two separate Google client IDs are defined but implementation only uses `GOOGLE_WEB_CLIENT_ID`.

**Current:**
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

**Impact**: Confusion about which to use, both are required in .env but only one is used

**Suggestion**:
- If only web client ID is needed, remove `GOOGLE_CLIENT_ID`
- If different IDs for Android/iOS are needed, rename for clarity:
```env
# For Android OAuth (if needed separately)
GOOGLE_ANDROID_CLIENT_ID=your-android-id.apps.googleusercontent.com
# For web-based OAuth (current implementation)
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## Code Smells Detected

### 1. Dead Code - useGoogleAuth Hook
**Location**: `src/hooks/useGoogleAuth.ts` (entire file)
**Smell**: Speculative Generality
**Description**: Hook is fully implemented and tested but never used

### 2. Duplicate Functionality
**Location**: LoginScreen.tsx (lines 31-68) vs useGoogleAuth.ts
**Smell**: Duplicate Code
**Description**: Two different implementations of Google authentication

### 3. Mixed Abstraction Levels
**Location**: LoginScreen.tsx `handleGoogleSignIn`
**Description**: UI component handles low-level OAuth flow details (URL parsing, token extraction, session management) that should be in a service or hook

### 4. Inconsistent State Management
**Location**: LoginScreen.tsx
**Description**: Email auth uses hook pattern (`useLogin`), Google auth uses inline state

### 5. Missing Abstraction
**Location**: LoginScreen.tsx lines 44-58
**Description**: Complex URL parsing and token extraction logic embedded in UI component

## Architecture Assessment

### Current Architecture (Problematic)

```
LoginScreen (UI Component)
├── useLogin() hook                    ← Email/Password auth
│   └── authStore.signIn()
│       └── signInWithEmail()
│           └── supabase.auth.signInWithPassword()
│
└── handleGoogleSignIn() inline       ← Google auth (inconsistent!)
    ├── signInWithGoogleOAuth()
    ├── WebBrowser.openAuthSessionAsync()
    ├── Manual URL parsing (UNSAFE!)
    └── supabase.auth.setSession()    ← Bypasses validation!

UNUSED: useGoogleAuth() hook (dead code)
UNUSED: authStore.signInWithGoogle() (dead code)
```

### Recommended Architecture

**Option 1: Unified Hook Pattern (Recommended)**
```
LoginScreen (UI Component)
├── useLogin() hook                    ← Email/Password
│   └── authStore.signIn()
│       └── signInWithEmail()
│
└── useGoogleSignIn() hook            ← Google OAuth (NEW)
    └── authStore.signInWithGoogle()
        ├── useGoogleAuth() OR
        ├── signInWithGoogleOAuth()
        │   └── WebBrowser.openAuthSessionAsync()
        └── signInWithIdToken()
            └── supabase.auth.signInWithIdToken()
```

**Option 2: Simplified Browser-Based**
```
LoginScreen (UI Component)
├── useLogin() hook
│   └── authStore.signIn()
│
└── useGoogleSignIn() hook
    └── signInWithGoogleOAuth()
        ├── WebBrowser.openAuthSessionAsync()
        └── Let Supabase handle callback automatically
            (no manual token parsing!)
```

### Dependency Direction ✓
Correct flow: Screen → Hook → Store → Service → Supabase
- Email/password follows this ✓
- Google auth bypasses hook and store ✗

## Test Analysis

### Test Coverage Summary

| Component | Tests | Passing | Failing | Pass Rate |
|-----------|-------|---------|---------|-----------|
| supabase.ts (Google functions) | 17 | 17 | 0 | 100% |
| useGoogleAuth.ts | 43 | 43 | 0 | 100% |
| LoginScreen (Google tests) | 18 | 0 | 18 | 0% |
| **Total** | **78** | **60** | **18** | **77%** |

### Test Failures Analysis

All 18 LoginScreen test failures are due to **React Native Paper mocking issues**, NOT implementation bugs:

```
Error: Element type is invalid: expected a string (for built-in components)
or a class/function (for composite components) but got: undefined.
Check the render method of `MockTextInput`.
```

This is the same mocking problem identified in Review 1 for the base auth screens.

### Test Quality Assessment

**Strengths:**
- Comprehensive edge case coverage (null checks, error handling, token variations)
- Clear, descriptive test names
- Good separation (service tests, hook tests, component tests)
- Tests are deterministic

**Concerns:**
- 43 tests for unused `useGoogleAuth` hook (wasted effort)
- LoginScreen component tests all fail (mocking issues)
- No integration tests for end-to-end OAuth flow
- No tests for security vulnerabilities (token validation)

## Security Analysis

### Critical Security Issues

1. **No Token Validation** (BLOCKER)
   - Tokens extracted from URL without any validation
   - No verification of JWT structure or signature
   - Vulnerable to token injection attacks

2. **Manual Session Management** (BLOCKER)
   - Calling `setSession` directly bypasses Supabase security checks
   - No verification that tokens are from Google
   - Could accept forged or expired tokens

3. **Token Exposure in Logs** (MAJOR)
   - Console logs may contain sensitive tokens
   - Logs accessible in debug builds

4. **No Session Verification** (MAJOR)
   - After `setSession`, no check that session was actually created
   - No user verification

### Security Best Practices Missing

- [ ] Token format validation (JWT structure)
- [ ] Token signature verification
- [ ] Session verification after creation
- [ ] Error message sanitization
- [ ] Rate limiting on OAuth attempts
- [ ] PKCE (Proof Key for Code Exchange) flow
- [ ] State parameter for CSRF protection

### Recommended Security Improvements

1. **Use Supabase's automatic OAuth handling** (let `detectSessionInUrl: true` do its job)
2. **Validate tokens before setSession** if manual handling is required
3. **Verify session after creation**
4. **Implement PKCE flow** for mobile OAuth
5. **Add rate limiting** for sign-in attempts
6. **Sanitize all logs** to prevent token exposure

## Validation Logic Review

### Current Validation: NONE ✗

The Google OAuth implementation has **zero validation**:
- No check that URL came from Google
- No check that tokens are valid JWTs
- No check that tokens haven't expired
- No check that session was created
- No CSRF protection

This is a **critical security vulnerability**.

### Recommended Validation

```typescript
// 1. Validate OAuth callback URL source
if (!result.url.startsWith('Stepper://')) {
  throw new Error('Invalid OAuth callback URL');
}

// 2. Validate token format (basic JWT check)
const isValidJWT = (token: string) => {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
};

if (!isValidJWT(accessToken) || !isValidJWT(refreshToken)) {
  throw new Error('Invalid token format');
}

// 3. Let Supabase validate tokens
const { error } = await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken,
});

if (error) {
  throw error;
}

// 4. Verify session was created
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
  throw new Error('Failed to establish session');
}

// 5. Verify user exists
if (!session.user?.id) {
  throw new Error('Invalid user session');
}
```

## Recommendation

**Status**: **REVISE** (Multiple Blockers)

**Confidence**: HIGH

The implementation demonstrates good code quality and comprehensive testing, but has **critical architectural and security issues** that must be addressed before production deployment.

### Blocking Issues (Must Fix)
1. ✗ Create formal plan for Google authentication feature
2. ✗ Choose and implement ONE OAuth approach (remove the other)
3. ✗ Fix security vulnerability in manual token handling
4. ✗ Implement proper token validation
5. ✗ Remove or integrate unused `useGoogleAuth` hook

### Next Steps

**Required Actions (Priority Order):**

1. **STOP Development** - Do not deploy this feature to production

2. **Create Formal Plan** (`docs/plans/11_GoogleAuth.md`)
   - [ ] Document requirements and user stories
   - [ ] Define security requirements
   - [ ] Choose OAuth implementation approach
   - [ ] Define error handling strategy
   - [ ] List acceptance criteria

3. **Fix Security Issues**
   - [ ] Implement automatic OAuth callback handling OR
   - [ ] Add comprehensive token validation
   - [ ] Remove token exposure from logs
   - [ ] Add session verification

4. **Resolve Architectural Issues**
   - [ ] Choose one OAuth implementation (expo-auth-session OR browser-based)
   - [ ] Remove unused code (hook OR inline implementation)
   - [ ] Integrate with authStore consistently
   - [ ] Create useGoogleSignIn hook for consistency

5. **Address Code Quality**
   - [ ] Extract magic strings to constants
   - [ ] Unify error handling approach
   - [ ] Add iOS deep link configuration

6. **Testing**
   - [ ] Fix or accept component test mocking issues
   - [ ] Add integration tests for OAuth flow
   - [ ] Add security-focused tests (token validation, injection attempts)

7. **User Acceptance Test**
   - [ ] Present revised plan to user
   - [ ] Get approval on security approach
   - [ ] Get approval on architecture choice
   - [ ] Manual testing of OAuth flow

### Risk Assessment

**Current Risks:**
- **Security Risk**: CRITICAL - Token validation bypass could allow account hijacking
- **Architecture Risk**: HIGH - Duplicate implementations and unused code
- **Maintainability Risk**: HIGH - Inconsistent patterns and dead code
- **Process Risk**: MEDIUM - No formal plan violates governance policy

**After Fixes:**
- **Security Risk**: LOW - With proper validation and Supabase handling
- **Architecture Risk**: LOW - Single, clean implementation
- **Maintainability Risk**: LOW - Consistent with existing patterns
- **Process Risk**: NONE - Plan approved and followed

---

## Detailed Issue Summary

### Must Fix Before Production (Blockers)
1. Create formal plan and get approval
2. Fix manual token extraction security vulnerability
3. Remove duplicate OAuth implementation (choose one)
4. Integrate with authStore consistently

### Should Fix (Major Issues)
5. Remove unused authStore.signInWithGoogle or integrate it
6. Sanitize token exposure in logs
7. Synchronize loading states
8. Extract magic strings to constants

### Nice to Fix (Minor Issues)
9. Unify error display (inline vs alerts)
10. Add iOS deep link configuration
11. Add error boundary
12. Clean up redundant environment variables

---

**USER ACCEPTANCE REQUIRED**: Before proceeding with revisions, please confirm:

1. **Approach Decision**: Should we use expo-auth-session (useGoogleAuth hook) or browser-based OAuth (current LoginScreen implementation)?

2. **Security Approach**: Are you comfortable with Supabase's automatic OAuth handling (`detectSessionInUrl: true`), or do you require manual token control?

3. **Scope Decision**: Should this feature be completed now or deferred to a future iteration after the base auth screens are fully tested?

4. **Testing**: Are you comfortable accepting component test failures as a known mocking limitation, or should we invest time fixing the React Native Paper mocks?

---

**Reviewer Signature**: Claude Sonnet 4.5
**Review Date**: 2026-01-18
**Review Duration**: Comprehensive analysis of 6 implementation files, 3 test suites, and security assessment

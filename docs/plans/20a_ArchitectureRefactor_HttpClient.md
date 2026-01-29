# Plan: Architecture Refactor - HTTP Client Infrastructure (Phase 1)

## Summary

Set up the HTTP client infrastructure in the mobile app that will be used by all feature API services to communicate with the .NET backend. This is the foundation that must be completed before any feature-specific refactoring can begin.

## Prerequisites

- None (this is the first phase)

## Affected Feature Slices

### Mobile (Stepper.Mobile)
- **config/**: New API configuration file
- **services/api/**: New HTTP client and types

### Backend (Stepper.Api)
- **Common/**: API versioning setup
- **Program.cs**: Route prefix configuration

## Proposed Types

### Mobile - New Infrastructure

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `ApiConfig` | `config/api.ts` | API base URL and version configuration |
| `ApiResponse<T>` | `services/api/types.ts` | Generic response wrapper matching backend format |
| `ApiError` | `services/api/types.ts` | Typed error class for API errors |
| `ApiErrorResponse` | `services/api/types.ts` | Error response structure from backend |
| `apiClient` | `services/api/client.ts` | HTTP client with auth header injection |

### Backend - Configuration

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| Route prefix | Controllers | All controllers use `/api/v1/` prefix |

## Implementation Steps

### Step 1: Backend - API Versioning

Add route prefix to all controllers:

1. Update each controller's `[Route]` attribute:
   - `UsersController`: `[Route("api/v1/users")]`
   - `StepsController`: `[Route("api/v1/steps")]`
   - `FriendsController`: `[Route("api/v1/friends")]`
   - `GroupsController`: `[Route("api/v1/groups")]`

2. Verify all endpoints still work with new prefix

### Step 2: Mobile - API Configuration

Create `Stepper.Mobile/src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
  VERSION: 'v1',
  get API_URL() {
    return `${this.BASE_URL}/api/${this.VERSION}`;
  },
  TIMEOUT: 30000, // 30 seconds
};
```

### Step 3: Mobile - API Types

Create `Stepper.Mobile/src/services/api/types.ts`:

```typescript
// Matches backend ApiResponse<T> format
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors: string[];
}

// Error response from backend
export interface ApiErrorResponse {
  success: false;
  data: null;
  errors: string[];
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors: string[] = []
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: ApiErrorResponse, statusCode: number): ApiError {
    const message = response.errors[0] || 'An error occurred';
    return new ApiError(message, statusCode, response.errors);
  }
}
```

### Step 4: Mobile - HTTP Client

Create `Stepper.Mobile/src/services/api/client.ts`:

```typescript
import { supabase } from '../supabase';
import { API_CONFIG } from '../../config/api';
import { ApiResponse, ApiError, ApiErrorResponse } from './types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request<T>(
  method: HttpMethod,
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_CONFIG.API_URL}${endpoint}`;
  const token = await getAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeout || API_CONFIG.TIMEOUT
  );

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await response.json() as ApiResponse<T> | ApiErrorResponse;

    if (!response.ok || !json.success) {
      throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
    }

    return json.data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

// Multipart form data request (for file uploads)
async function requestFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_CONFIG.API_URL}${endpoint}`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {};
  // Note: Don't set Content-Type for FormData - browser sets it with boundary

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const json = await response.json() as ApiResponse<T> | ApiErrorResponse;

  if (!response.ok || !json.success) {
    throw ApiError.fromResponse(json as ApiErrorResponse, response.status);
  }

  return json.data;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('GET', endpoint, options),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', endpoint, { ...options, body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', endpoint, { ...options, body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', endpoint, { ...options, body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('DELETE', endpoint, options),

  upload: <T>(endpoint: string, formData: FormData) =>
    requestFormData<T>(endpoint, formData),
};
```

### Step 5: Environment Variable

Update `.env.example` and `.env` files:

```
EXPO_PUBLIC_API_URL=http://localhost:5000
```

Update `babel.config.js` if needed for environment variable support.

### Step 6: Update Index Exports

Create/update `Stepper.Mobile/src/services/api/index.ts`:

```typescript
export { apiClient } from './client';
export { ApiError, type ApiResponse, type ApiErrorResponse } from './types';
```

## Dependencies

### New Packages Required

**None** - Uses built-in `fetch` API

## Database Changes

**None**

## Tests

### Unit Tests to Add
- `Stepper.Mobile/src/services/api/__tests__/client.test.ts`
  - Test auth token injection
  - Test error handling
  - Test timeout handling
  - Test request/response formatting

### Manual Testing
- Verify backend endpoints work with `/api/v1/` prefix
- Verify mobile client can connect to backend
- Verify auth token is properly included in requests

## Acceptance Criteria

- [ ] All backend controllers use `/api/v1/` route prefix
- [ ] `apiClient` successfully makes authenticated GET requests
- [ ] `apiClient` successfully makes authenticated POST/PUT/DELETE requests
- [ ] `apiClient.upload` successfully handles multipart/form-data
- [ ] JWT token is automatically included in Authorization header
- [ ] Error responses are properly typed and handled
- [ ] Request timeout works correctly
- [ ] API_BASE_URL is configurable via environment variable
- [ ] Unit tests pass for client module

## Risks & Open Questions

### Risks
1. **Breaking existing tests**: Backend route changes may break existing integration tests
   - Mitigation: Update tests immediately after route changes

### Open Questions
- None - all decisions made

## Agent Assignment

| Step | Agent | Notes |
|------|-------|-------|
| 1 | Backend Engineer | Update controller routes |
| 2-6 | Frontend Engineer | Create client infrastructure |
| Tests | Tester | Write and verify tests |

## Handoff to Next Phase

After this plan is complete:
- Plans 20b through 20g can begin in parallel
- Each feature plan will import and use `apiClient` from this infrastructure

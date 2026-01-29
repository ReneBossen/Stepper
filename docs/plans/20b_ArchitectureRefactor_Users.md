# Plan: Architecture Refactor - Users Feature

## Summary

Refactor the Users feature to route all data operations through the .NET API instead of direct Supabase calls. This includes user profile management, user preferences, and avatar uploads. Avatar uploads will go through the backend which proxies to Supabase Storage.

## Prerequisites

- **20a_ArchitectureRefactor_HttpClient.md** must be complete

## Affected Feature Slices

### Backend (Stepper.Api/Users)
- `UsersController.cs`: Add preferences and avatar endpoints
- `UserService.cs` / `IUserService.cs`: Add new business logic
- `UserRepository.cs` / `IUserRepository.cs`: Add data access methods
- `DTOs/`: New request/response types

### Mobile (Stepper.Mobile)
- `services/api/usersApi.ts`: Complete rewrite
- `services/api/userPreferencesApi.ts`: Complete rewrite

## Proposed Types

### Backend - New DTOs

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `UserPreferencesResponse` | Users/DTOs | User preferences response |
| `UpdateUserPreferencesRequest` | Users/DTOs | Update preferences request |
| `AvatarUploadResponse` | Users/DTOs | Avatar URL after upload |

## Implementation Steps

### Phase 1: Backend - User Preferences Endpoints

#### Step 1.1: Add DTOs

Create `Stepper.Api/Users/DTOs/UserPreferencesResponse.cs`:
```csharp
public record UserPreferencesResponse(
    bool NotificationsEnabled,
    int DailyStepGoal,
    string DistanceUnit,
    bool PrivateProfile
);
```

Create `Stepper.Api/Users/DTOs/UpdateUserPreferencesRequest.cs`:
```csharp
public record UpdateUserPreferencesRequest(
    bool? NotificationsEnabled,
    int? DailyStepGoal,
    string? DistanceUnit,
    bool? PrivateProfile
);
```

#### Step 1.2: Update Repository

Add to `IUserRepository.cs`:
```csharp
Task<UserPreferences?> GetPreferencesAsync(Guid userId);
Task<UserPreferences> UpdatePreferencesAsync(Guid userId, UserPreferences preferences);
```

Implement in `UserRepository.cs`.

#### Step 1.3: Update Service

Add to `IUserService.cs`:
```csharp
Task<UserPreferencesResponse> GetPreferencesAsync(Guid userId);
Task<UserPreferencesResponse> UpdatePreferencesAsync(Guid userId, UpdateUserPreferencesRequest request);
```

Implement in `UserService.cs`.

#### Step 1.4: Add Controller Endpoints

Add to `UsersController.cs`:
```csharp
/// <summary>
/// Get current user's preferences
/// </summary>
[HttpGet("me/preferences")]
public async Task<ActionResult<ApiResponse<UserPreferencesResponse>>> GetPreferences()

/// <summary>
/// Update current user's preferences
/// </summary>
[HttpPut("me/preferences")]
public async Task<ActionResult<ApiResponse<UserPreferencesResponse>>> UpdatePreferences(
    [FromBody] UpdateUserPreferencesRequest request)
```

### Phase 2: Backend - Avatar Upload Endpoint

#### Step 2.1: Add DTO

Create `Stepper.Api/Users/DTOs/AvatarUploadResponse.cs`:
```csharp
public record AvatarUploadResponse(string AvatarUrl);
```

#### Step 2.2: Update Service

Add to `IUserService.cs`:
```csharp
Task<AvatarUploadResponse> UploadAvatarAsync(Guid userId, Stream fileStream, string fileName, string contentType);
```

Implement in `UserService.cs`:
- Validate file type (image only)
- Validate file size (max 5MB)
- Upload to Supabase Storage
- Update user profile with new avatar URL
- Return the public URL

#### Step 2.3: Add Controller Endpoint

Add to `UsersController.cs`:
```csharp
/// <summary>
/// Upload avatar image for current user
/// </summary>
[HttpPost("me/avatar")]
[Consumes("multipart/form-data")]
public async Task<ActionResult<ApiResponse<AvatarUploadResponse>>> UploadAvatar(
    IFormFile file)
```

### Phase 3: Mobile - Refactor usersApi.ts

Replace all Supabase calls with HTTP client calls:

| Current Function | New Implementation |
|------------------|-------------------|
| `getCurrentUser()` | `GET /api/v1/users/me` |
| `updateProfile(data)` | `PUT /api/v1/users/me` |
| `uploadAvatar(uri)` | `POST /api/v1/users/me/avatar` (FormData) |

```typescript
import { apiClient } from './client';
import type { User } from '../../types/user';

export const usersApi = {
  getCurrentUser: async (): Promise<User> => {
    return apiClient.get<User>('/users/me');
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    return apiClient.put<User>('/users/me', data);
  },

  uploadAvatar: async (uri: string): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type,
    } as unknown as Blob);

    return apiClient.upload<{ avatarUrl: string }>('/users/me/avatar', formData);
  },
};
```

### Phase 4: Mobile - Refactor userPreferencesApi.ts

Replace all Supabase calls:

| Current Function | New Implementation |
|------------------|-------------------|
| `getPreferences()` | `GET /api/v1/users/me/preferences` |
| `updatePreferences(data)` | `PUT /api/v1/users/me/preferences` |

```typescript
import { apiClient } from './client';
import type { UserPreferences } from '../../types/userPreferences';

export const userPreferencesApi = {
  getPreferences: async (): Promise<UserPreferences> => {
    return apiClient.get<UserPreferences>('/users/me/preferences');
  },

  updatePreferences: async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
    return apiClient.put<UserPreferences>('/users/me/preferences', data);
  },
};
```

## Dependencies

### New Packages Required

**Backend**: None - Supabase client already handles storage

**Mobile**: None - Uses built-in FormData

## Database Changes

**None** - `user_preferences` table already exists

## Tests

### Backend Unit Tests
- `Stepper.Api.Tests/Users/UserServicePreferencesTests.cs`
- `Stepper.Api.Tests/Users/UserServiceAvatarTests.cs`

### Backend Integration Tests
- `Stepper.Api.Tests/Users/UsersControllerPreferencesTests.cs`
- `Stepper.Api.Tests/Users/UsersControllerAvatarTests.cs`

### Mobile Tests
- Update `Stepper.Mobile/src/services/api/__tests__/usersApi.test.ts`
- Update `Stepper.Mobile/src/services/api/__tests__/userPreferencesApi.test.ts`
- Mock `apiClient` instead of Supabase

## Acceptance Criteria

### Backend
- [ ] `GET /api/v1/users/me/preferences` returns user preferences
- [ ] `PUT /api/v1/users/me/preferences` updates and returns preferences
- [ ] `POST /api/v1/users/me/avatar` accepts multipart form data
- [ ] Avatar upload validates file type (images only)
- [ ] Avatar upload validates file size (max 5MB)
- [ ] Avatar is stored in Supabase Storage
- [ ] User profile is updated with new avatar URL
- [ ] All endpoints have XML documentation

### Mobile
- [ ] `usersApi.ts` makes zero direct Supabase data calls
- [ ] `userPreferencesApi.ts` makes zero direct Supabase data calls
- [ ] Avatar upload works with FormData
- [ ] All existing functionality works as before
- [ ] Updated tests pass

## Risks & Open Questions

### Risks
1. **File upload size limits**: Large avatars may fail
   - Mitigation: Clear error messages, client-side validation

### Open Questions
- None - all decisions made (uploads through backend)

## Agent Assignment

| Phase | Agent | Notes |
|-------|-------|-------|
| 1-2 | Backend Engineer | New endpoints |
| 3-4 | Frontend Engineer | API refactoring |
| Tests | Tester | Write and verify tests |

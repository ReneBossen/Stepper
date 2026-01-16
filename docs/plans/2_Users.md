# Plan 2: Users Feature

## Summary

This plan implements the Users feature for managing user profiles linked to Supabase Auth. Users authenticate via Supabase Auth (email/password or OAuth), and this feature provides profile management endpoints. The `users` table stores additional profile data linked to Supabase's `auth.users` via the `id` column.

## Affected Feature Slices

- **Users**: Complete vertical slice (Controller, Service, Repository, Models, DTOs)
- **Common**: May use shared infrastructure from Plan 1

## Proposed Types

| Type Name | Feature/Location | Responsibility |
|-----------|------------------|----------------|
| UsersController | Users/ | HTTP endpoints for user profiles |
| IUserService | Users/ | Interface for user business logic |
| UserService | Users/ | User profile business logic |
| IUserRepository | Users/ | Interface for user data access |
| UserRepository | Users/ | Supabase data access for users |
| User | Users/ | Domain model for user profile |
| UserProfile | Users/ | Domain model with display info |
| GetProfileResponse | Users/DTOs | Response DTO for profile retrieval |
| UpdateProfileRequest | Users/DTOs | Request DTO for profile updates |
| UserPreferences | Users/DTOs | Embedded preferences object |

## Implementation Steps

1. **Create Users folder structure**:
   ```
   WalkingApp.Api/Users/
   ├── UsersController.cs
   ├── IUserService.cs
   ├── UserService.cs
   ├── IUserRepository.cs
   ├── UserRepository.cs
   ├── User.cs
   └── DTOs/
       ├── GetProfileResponse.cs
       ├── UpdateProfileRequest.cs
       └── UserPreferences.cs
   ```

2. **Define User domain model**:
   ```csharp
   public class User
   {
       public Guid Id { get; set; }  // Links to auth.users.id
       public string DisplayName { get; set; }
       public string? AvatarUrl { get; set; }
       public DateTime CreatedAt { get; set; }
       public DateTime UpdatedAt { get; set; }
       public UserPreferences Preferences { get; set; }
   }
   ```

3. **Define DTOs**:
   - `GetProfileResponse`: Id, DisplayName, AvatarUrl, Preferences, CreatedAt
   - `UpdateProfileRequest`: DisplayName, AvatarUrl, Preferences
   - `UserPreferences`: Units (metric/imperial), Notifications settings, Privacy settings

4. **Implement IUserRepository and UserRepository**:
   - `GetByIdAsync(Guid userId)` - Get user profile
   - `CreateAsync(User user)` - Create profile (on first login)
   - `UpdateAsync(User user)` - Update profile
   - Use Supabase client with authenticated user token

5. **Implement IUserService and UserService**:
   - `GetProfileAsync(Guid userId)` - Get current user's profile
   - `UpdateProfileAsync(Guid userId, UpdateProfileRequest request)` - Update profile
   - `EnsureProfileExistsAsync(Guid userId)` - Create profile if not exists
   - Validation logic for display name, avatar URL

6. **Implement UsersController**:
   - `GET /api/users/me` - Get authenticated user's profile
   - `PUT /api/users/me` - Update authenticated user's profile
   - `GET /api/users/{id}` - Get public profile by ID (for friends feature)
   - All endpoints require authentication

7. **Register services** in Program.cs or ServiceCollectionExtensions

8. **Create Supabase migration** for users table (SQL script in docs):
   ```sql
   CREATE TABLE users (
       id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
       display_name TEXT NOT NULL,
       avatar_url TEXT,
       preferences JSONB DEFAULT '{}',
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

9. **Create RLS policies** for users table:
   ```sql
   -- Users can view their own profile
   CREATE POLICY "Users can view own profile"
       ON users FOR SELECT
       USING (auth.uid() = id);

   -- Users can update their own profile
   CREATE POLICY "Users can update own profile"
       ON users FOR UPDATE
       USING (auth.uid() = id)
       WITH CHECK (auth.uid() = id);

   -- Users can insert their own profile
   CREATE POLICY "Users can insert own profile"
       ON users FOR INSERT
       WITH CHECK (auth.uid() = id);

   -- Users can view friends' profiles (for social features)
   CREATE POLICY "Users can view friends profiles"
       ON users FOR SELECT
       USING (
           id IN (
               SELECT friend_id FROM friendships
               WHERE user_id = auth.uid() AND status = 'accepted'
           )
       );
   ```

10. **Add trigger** for updated_at:
    ```sql
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ```

## Dependencies

- Plan 1 (Supabase Integration) must be completed first
- No additional NuGet packages required

## Database Changes

**New Table**: `users`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) |
| display_name | TEXT | NOT NULL |
| avatar_url | TEXT | nullable |
| preferences | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS Policies**: As defined above

## Tests

**Unit Tests** (WalkingApp.UnitTests/Users/):
- `UserServiceTests`
  - Test profile retrieval returns correct data
  - Test profile update validates input
  - Test display name validation (length, characters)
  - Test avatar URL validation (format)

**Integration Tests** (WalkingApp.Api.Tests/Users/):
- `UsersControllerTests`
  - GET /api/users/me returns 401 without token
  - GET /api/users/me returns profile for authenticated user
  - PUT /api/users/me updates profile correctly
  - PUT /api/users/me returns 400 for invalid input

**Architecture Tests**:
- Users feature does not depend on other features (Steps, Friends, Groups)
- Controller only depends on Service interface
- Repository only depends on Supabase client

## Acceptance Criteria

- [ ] Users table is created in Supabase
- [ ] RLS policies correctly restrict access
- [ ] GET /api/users/me returns authenticated user's profile
- [ ] PUT /api/users/me updates profile and returns updated data
- [ ] Profile is auto-created on first access if not exists
- [ ] Display name validation (2-50 characters, no profanity)
- [ ] Avatar URL validation (valid URL format)
- [ ] Preferences are stored and retrieved correctly
- [ ] All endpoints return standardized ApiResponse
- [ ] Unauthenticated requests return 401

## Risks and Open Questions

| Risk/Question | Mitigation/Answer |
|--------------|-------------------|
| Profile creation timing (on auth vs first API call) | Create on first API call for simplicity |
| Display name uniqueness | Not required initially, can add later |
| Avatar storage (URL only vs upload) | URL only for MVP, can add upload later |
| Preferences schema evolution | Use JSONB for flexibility |

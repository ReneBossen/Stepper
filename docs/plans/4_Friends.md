# Plan 4: Friends Feature

## Summary

This plan implements the Friends feature for social connections between users. Users can send friend requests, accept/reject requests, view their friend list, and view friends' step data. This feature enables the social aspect of the walking app and unlocks viewing friends' activity.

## Affected Feature Slices

- **Friends**: Complete vertical slice (Controller, Service, Repository, Models, DTOs)
- **Steps**: RLS policy update to allow friends to view each other's steps
- **Users**: RLS policy update to allow friends to view each other's profiles
- **Common**: Uses shared infrastructure from Plan 1

## Proposed Types

| Type Name | Feature/Location | Responsibility |
|-----------|------------------|----------------|
| FriendsController | Friends/ | HTTP endpoints for friend operations |
| IFriendService | Friends/ | Interface for friend business logic |
| FriendService | Friends/ | Friend request and relationship logic |
| IFriendRepository | Friends/ | Interface for friend data access |
| FriendRepository | Friends/ | Supabase data access for friendships |
| Friendship | Friends/ | Domain model for friendship relationship |
| FriendRequest | Friends/ | Domain model for pending request |
| SendFriendRequestRequest | Friends/DTOs | Request DTO for sending request |
| FriendRequestResponse | Friends/DTOs | Response DTO for friend request |
| FriendResponse | Friends/DTOs | Response DTO for friend info |
| FriendListResponse | Friends/DTOs | Response DTO for friend list |
| FriendStepsResponse | Friends/DTOs | Response DTO for friend's steps |
| FriendshipStatus | Friends/ | Enum: Pending, Accepted, Rejected, Blocked |

## Implementation Steps

1. **Create Friends folder structure**:
   ```
   Stepper.Api/Friends/
   ├── FriendsController.cs
   ├── IFriendService.cs
   ├── FriendService.cs
   ├── IFriendRepository.cs
   ├── FriendRepository.cs
   ├── Friendship.cs
   ├── FriendshipStatus.cs
   └── DTOs/
       ├── SendFriendRequestRequest.cs
       ├── FriendRequestResponse.cs
       ├── FriendResponse.cs
       ├── FriendListResponse.cs
       └── FriendStepsResponse.cs
   ```

2. **Define FriendshipStatus enum**:
   ```csharp
   public enum FriendshipStatus
   {
       Pending,
       Accepted,
       Rejected,
       Blocked
   }
   ```

3. **Define Friendship domain model**:
   ```csharp
   public class Friendship
   {
       public Guid Id { get; set; }
       public Guid RequesterId { get; set; }  // User who sent request
       public Guid AddresseeId { get; set; }  // User who received request
       public FriendshipStatus Status { get; set; }
       public DateTime CreatedAt { get; set; }
       public DateTime? AcceptedAt { get; set; }
   }
   ```

4. **Define DTOs**:
   - `SendFriendRequestRequest`: FriendUserId (Guid)
   - `FriendRequestResponse`: Id, RequesterProfile, Status, CreatedAt
   - `FriendResponse`: UserId, DisplayName, AvatarUrl, FriendsSince
   - `FriendListResponse`: Friends (list), TotalCount
   - `FriendStepsResponse`: FriendId, DisplayName, TodaySteps, WeeklySteps

5. **Implement IFriendRepository and FriendRepository**:
   - `SendRequestAsync(Guid requesterId, Guid addresseeId)` - Create pending request
   - `GetPendingRequestsAsync(Guid userId)` - Get incoming requests
   - `GetSentRequestsAsync(Guid userId)` - Get outgoing requests
   - `AcceptRequestAsync(Guid requestId, Guid userId)` - Accept request
   - `RejectRequestAsync(Guid requestId, Guid userId)` - Reject request
   - `GetFriendsAsync(Guid userId)` - Get accepted friends
   - `GetFriendshipAsync(Guid userId, Guid friendId)` - Get specific friendship
   - `RemoveFriendAsync(Guid userId, Guid friendId)` - Remove friendship
   - `BlockUserAsync(Guid userId, Guid blockedUserId)` - Block user

6. **Implement IFriendService and FriendService**:
   - `SendFriendRequestAsync(Guid userId, SendFriendRequestRequest request)` - Send request
   - `GetPendingRequestsAsync(Guid userId)` - Get incoming requests
   - `GetSentRequestsAsync(Guid userId)` - Get sent requests
   - `AcceptRequestAsync(Guid userId, Guid requestId)` - Accept request
   - `RejectRequestAsync(Guid userId, Guid requestId)` - Reject request
   - `GetFriendsAsync(Guid userId)` - Get friend list
   - `GetFriendStepsAsync(Guid userId, Guid friendId)` - Get friend's steps
   - `RemoveFriendAsync(Guid userId, Guid friendId)` - Unfriend
   - Validation: Cannot friend self, cannot duplicate requests, check blocking

7. **Implement FriendsController**:
   - `POST /api/friends/requests` - Send friend request
   - `GET /api/friends/requests/incoming` - Get pending incoming requests
   - `GET /api/friends/requests/outgoing` - Get pending outgoing requests
   - `POST /api/friends/requests/{requestId}/accept` - Accept request
   - `POST /api/friends/requests/{requestId}/reject` - Reject request
   - `GET /api/friends` - Get friend list
   - `GET /api/friends/{friendId}` - Get friend profile
   - `GET /api/friends/{friendId}/steps` - Get friend's steps
   - `DELETE /api/friends/{friendId}` - Remove friend
   - All endpoints require authentication

8. **Register services** in Program.cs or ServiceCollectionExtensions

9. **Create Supabase migration** for friendships table:
   ```sql
   CREATE TABLE friendships (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
       created_at TIMESTAMPTZ DEFAULT NOW(),
       accepted_at TIMESTAMPTZ,

       CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
       CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
   );

   CREATE INDEX idx_friendships_requester ON friendships(requester_id);
   CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
   CREATE INDEX idx_friendships_status ON friendships(status);
   ```

10. **Create RLS policies** for friendships table:
    ```sql
    -- Enable RLS
    ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

    -- Users can view friendships they're part of
    CREATE POLICY "Users can view own friendships"
        ON friendships FOR SELECT
        USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

    -- Users can send friend requests (insert as requester)
    CREATE POLICY "Users can send friend requests"
        ON friendships FOR INSERT
        WITH CHECK (auth.uid() = requester_id AND status = 'pending');

    -- Addressee can update status (accept/reject)
    CREATE POLICY "Addressee can respond to requests"
        ON friendships FOR UPDATE
        USING (auth.uid() = addressee_id AND status = 'pending')
        WITH CHECK (auth.uid() = addressee_id);

    -- Either party can delete friendship
    CREATE POLICY "Users can remove friendships"
        ON friendships FOR DELETE
        USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
    ```

11. **Update step_entries RLS** to allow friends to view:
    ```sql
    -- Friends can view each other's steps
    CREATE POLICY "Users can view friends steps"
        ON step_entries FOR SELECT
        USING (
            user_id = auth.uid() OR
            user_id IN (
                SELECT CASE
                    WHEN requester_id = auth.uid() THEN addressee_id
                    ELSE requester_id
                END
                FROM friendships
                WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
                  AND status = 'accepted'
            )
        );
    ```

12. **Update users RLS** to allow friends to view profiles:
    ```sql
    -- Friends can view each other's profiles
    CREATE POLICY "Users can view friends profiles"
        ON users FOR SELECT
        USING (
            id = auth.uid() OR
            id IN (
                SELECT CASE
                    WHEN requester_id = auth.uid() THEN addressee_id
                    ELSE requester_id
                END
                FROM friendships
                WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
                  AND status = 'accepted'
            )
        );
    ```

13. **Create helper function** for getting friend IDs:
    ```sql
    CREATE OR REPLACE FUNCTION get_friend_ids(p_user_id UUID)
    RETURNS TABLE (friend_id UUID)
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $$
        SELECT CASE
            WHEN requester_id = p_user_id THEN addressee_id
            ELSE requester_id
        END as friend_id
        FROM friendships
        WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
          AND status = 'accepted';
    $$;
    ```

## Dependencies

- Plan 1 (Supabase Integration) must be completed first
- Plan 2 (Users) must be completed for profile data
- Plan 3 (Steps) must be completed for viewing friend's steps
- No additional NuGet packages required

## Database Changes

**New Table**: `friendships`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| requester_id | UUID | NOT NULL, REFERENCES auth.users(id) |
| addressee_id | UUID | NOT NULL, REFERENCES auth.users(id) |
| status | TEXT | NOT NULL, CHECK IN (pending, accepted, rejected, blocked) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| accepted_at | TIMESTAMPTZ | nullable |

**Constraints**: no_self_friendship, unique_friendship

**RLS Policy Updates**:
- `step_entries`: Add friend viewing policy
- `users`: Add friend viewing policy

## Tests

**Unit Tests** (Stepper.UnitTests/Friends/):
- `FriendServiceTests`
  - Test sending request creates pending friendship
  - Test cannot send request to self
  - Test cannot send duplicate request
  - Test accepting request updates status
  - Test only addressee can accept
  - Test rejecting request updates status
  - Test friend list only includes accepted
  - Test removing friend deletes relationship

**Integration Tests** (Stepper.Api.Tests/Friends/):
- `FriendsControllerTests`
  - POST /api/friends/requests creates pending request
  - GET /api/friends/requests/incoming returns received requests
  - POST accept updates status to accepted
  - GET /api/friends returns only accepted friends
  - GET /api/friends/{id}/steps returns friend's steps (RLS)
  - Cannot view non-friend's steps (RLS)
  - DELETE /api/friends/{id} removes friendship

**Architecture Tests**:
- Friends feature minimizes dependencies on other features
- Uses repository interfaces for cross-feature data access

## Acceptance Criteria

- [ ] friendships table is created in Supabase
- [ ] RLS policies correctly restrict access
- [ ] Users can send friend requests
- [ ] Users can view pending incoming requests
- [ ] Users can accept/reject friend requests
- [ ] Users can view their friend list
- [ ] Users can view friends' profiles
- [ ] Users can view friends' step data
- [ ] Users can remove friends
- [ ] Cannot send request to self
- [ ] Cannot send duplicate request
- [ ] Blocked users cannot interact

## Risks and Open Questions

| Risk/Question | Mitigation/Answer |
|--------------|-------------------|
| Friend discovery (how to find users) | Future feature: search by email/username |
| Mutual vs. one-way friendships | Use mutual (both see each other) |
| Request expiration | Not implementing initially, can add later |
| Notification for friend requests | Supabase real-time or push notifications (future) |
| Privacy settings for step visibility | Add to user preferences later |

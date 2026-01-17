# Code Review: Friends Feature

**Plan**: `docs/plans/4_Friends.md`
**Iteration**: 1
**Date**: 2026-01-17

## Summary

The Friends feature implementation is well-structured and follows clean architecture principles with a proper vertical slice approach. The code demonstrates good separation of concerns with Controllers handling HTTP logic, Services managing business rules, and Repositories handling data access via Supabase. All 78 new tests pass, bringing the total test count to 190. However, there are several issues that need to be addressed before approval, including a missing API endpoint, N+1 query performance issues, a logical bug in BlockUserAsync, and missing authorization attributes.

## Checklist Results

### Architecture Compliance
- [x] Dependency direction preserved (Controller → Service → Repository → Supabase)
- [x] No business logic in controllers (controllers are thin HTTP adapters)
- [x] Feature slices are independent and loosely coupled
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected

### Code Quality
- [x] Follows coding standards
- [ ] No code smells (ISSUE #1, #2 - N+1 queries detected)
- [x] Proper error handling
- [x] No magic strings
- [x] Guard clauses present

### Plan Adherence
- [ ] All plan items implemented (ISSUE #3 - missing GET /api/friends/{friendId})
- [x] No unplanned changes
- [x] No scope creep

### Testing
- [x] Tests cover new functionality
- [x] Tests are deterministic
- [x] All tests pass (78 new tests, 190 total)

### Security
- [ ] RLS policies correctly defined (ISSUE #5 - UPDATE policy may be too restrictive)
- [ ] Authentication enforced (ISSUE #6 - missing [Authorize] attribute)
- [x] Authorization logic present

### Code Organization
- [x] One class per file
- [x] Proper file structure
- [x] XML documentation present

## Issues

### BLOCKER

#### Issue #1: N+1 Query Problem in GetPendingRequestsAsync
**File**: `/mnt/c/Users/rene_/source/repos/walkingApp/WalkingApp.Api/Friends/FriendService.cs`
**Lines**: 86-99
**Description**: The method loops through all pending requests and makes a separate database call for each requester's profile. With N pending requests, this results in N+1 database queries (1 to fetch friendships + N to fetch user profiles).

**Code**:
```csharp
foreach (var friendship in friendships)
{
    var requesterProfile = await _userRepository.GetByIdAsync(friendship.RequesterId);
    // ... build response
}
```

**Suggestion**: Add a batch method to IUserRepository like `GetUsersByIdsAsync(List<Guid> userIds)` and use it to fetch all user profiles in a single query. Then match them up in memory.

```csharp
var requesterIds = friendships.Select(f => f.RequesterId).Distinct().ToList();
var userProfiles = await _userRepository.GetUsersByIdsAsync(requesterIds);
var userDict = userProfiles.ToDictionary(u => u.Id);

foreach (var friendship in friendships)
{
    var requesterProfile = userDict.GetValueOrDefault(friendship.RequesterId);
    // ... build response
}
```

#### Issue #2: N+1 Query Problem in GetSentRequestsAsync and GetFriendsAsync
**File**: `/mnt/c/Users/rene_/source/repos/walkingApp/WalkingApp.Api/Friends/FriendService.cs`
**Lines**: 116-129 (GetSentRequestsAsync), 202-221 (GetFriendsAsync)
**Description**: Same N+1 query issue as Issue #1. GetSentRequestsAsync fetches addressee profiles in a loop, and GetFriendsAsync fetches friend profiles in a loop.

**Suggestion**: Apply the same batch fetching pattern as suggested in Issue #1.

#### Issue #3: Missing API Endpoint - GET /api/friends/{friendId}
**File**: `/mnt/c/Users/rene_/source/repos/walkingApp/WalkingApp.Api/Friends/FriendsController.cs`
**Description**: The plan specifies 9 endpoints, but only 8 are implemented. The missing endpoint is `GET /api/friends/{friendId}` which should return a specific friend's profile (as stated in Plan line 112).

**Current endpoints**:
1. POST /api/friends/requests
2. GET /api/friends/requests/incoming
3. GET /api/friends/requests/outgoing
4. POST /api/friends/requests/{requestId}/accept
5. POST /api/friends/requests/{requestId}/reject
6. GET /api/friends
7. GET /api/friends/{friendId}/steps
8. DELETE /api/friends/{friendId}

**Suggestion**: Add the missing endpoint:
```csharp
/// <summary>
/// Gets a specific friend's profile.
/// </summary>
/// <param name="friendId">The ID of the friend.</param>
/// <returns>The friend's profile.</returns>
[HttpGet("{friendId}")]
public async Task<ActionResult<ApiResponse<FriendResponse>>> GetFriend(Guid friendId)
{
    var userId = User.GetUserId();
    if (userId == null)
    {
        return Unauthorized(ApiResponse<FriendResponse>.ErrorResponse("User is not authenticated."));
    }

    try
    {
        // Verify friendship and get friend details
        var friendship = await _friendService.GetFriendshipAsync(userId.Value, friendId);
        if (friendship == null || friendship.Status != FriendshipStatus.Accepted)
        {
            return NotFound(ApiResponse<FriendResponse>.ErrorResponse("Friend not found."));
        }

        var friendProfile = await _userService.GetUserProfileAsync(friendId);
        return Ok(ApiResponse<FriendResponse>.SuccessResponse(new FriendResponse
        {
            UserId = friendId,
            DisplayName = friendProfile.DisplayName,
            AvatarUrl = friendProfile.AvatarUrl,
            FriendsSince = friendship.AcceptedAt ?? friendship.CreatedAt
        }));
    }
    catch (Exception ex)
    {
        return StatusCode(500, ApiResponse<FriendResponse>.ErrorResponse($"An error occurred: {ex.Message}"));
    }
}
```

Note: You'll also need to add a public method to IFriendService that exposes GetFriendshipAsync (currently only in the repository).

#### Issue #4: Logic Bug in BlockUserAsync
**File**: `/mnt/c/Users/rene_/source/repos/walkingApp/WalkingApp.Api/Friends/FriendRepository.cs`
**Lines**: 265-266
**Description**: When creating a new blocked relationship, the method calls `SendRequestAsync` which creates a friendship with status "pending", not "blocked". This is incorrect.

**Code**:
```csharp
// Create new blocked relationship
return await SendRequestAsync(userId, blockedUserId);
```

**Suggestion**: Create the blocked relationship directly instead of calling SendRequestAsync:
```csharp
// Create new blocked relationship
var entity = new FriendshipEntity
{
    Id = Guid.NewGuid(),
    RequesterId = userId,
    AddresseeId = blockedUserId,
    Status = "blocked",
    CreatedAt = DateTime.UtcNow
};

var response = await client
    .From<FriendshipEntity>()
    .Insert(entity);

var created = response.Models.FirstOrDefault();
if (created == null)
{
    throw new InvalidOperationException("Failed to block user.");
}

return created.ToFriendship();
```

### MAJOR

#### Issue #5: RLS UPDATE Policy May Be Too Restrictive
**File**: `/mnt/c/Users/rene_/source/repos/walkingApp/docs/migrations/004_create_friendships_table.sql`
**Lines**: 47-50
**Description**: The RLS UPDATE policy requires status to be 'pending' in the USING clause, which means accepted/rejected friendships cannot be updated (e.g., to block someone who is already a friend). This conflicts with the BlockUserAsync implementation which tries to update existing friendships to "blocked" status.

**Code**:
```sql
CREATE POLICY "Addressee can respond to requests"
    ON friendships FOR UPDATE
    USING (auth.uid() = addressee_id AND status = 'pending')
    WITH CHECK (auth.uid() = addressee_id);
```

**Suggestion**: Either:
1. Create a separate RLS policy for blocking that allows users to update their own friendships to blocked status, OR
2. Modify the UPDATE policy to allow both addressee updates (for accept/reject) and requester updates (for blocking), OR
3. Accept that blocking requires DELETE + INSERT operations instead of UPDATE

Option 1 (recommended):
```sql
-- Existing policy remains for addressee accepting/rejecting
CREATE POLICY "Addressee can respond to requests"
    ON friendships FOR UPDATE
    USING (auth.uid() = addressee_id AND status = 'pending')
    WITH CHECK (auth.uid() = addressee_id);

-- New policy for blocking
CREATE POLICY "Users can block friendships"
    ON friendships FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
    WITH CHECK ((auth.uid() = requester_id OR auth.uid() = addressee_id) AND status = 'blocked');
```

#### Issue #6: Missing Authorization Attribute on Controller
**File**: `/mnt/c/Users/rene_/source/repos/walkingApp/WalkingApp.Api/Friends/FriendsController.cs`
**Lines**: 11-13
**Description**: The FriendsController class does not have an `[Authorize]` attribute. While the controller checks for user authentication in each method using `User.GetUserId()`, explicit authorization attributes are a security best practice and provide defense in depth. Without the attribute, the endpoints rely solely on manual authentication checks which could be accidentally omitted in new methods.

**Code**:
```csharp
[ApiController]
[Route("api/friends")]
public class FriendsController : ControllerBase
```

**Suggestion**: Add the `[Authorize]` attribute to the controller class for explicit authentication enforcement:
```csharp
[ApiController]
[Route("api/friends")]
[Authorize]
public class FriendsController : ControllerBase
```

However, I notice that UsersController also doesn't have this attribute. This may be intentional based on the architecture using SupabaseAuthMiddleware. If authentication is handled globally by middleware and `User.GetUserId()` is the standard pattern, this may be acceptable. Request clarification on the authentication strategy.

### MINOR

#### Issue #7: Inconsistent Display Name in GetSentRequestsAsync
**File**: `/mnt/c/Users/rene_/source/repos/walkingApp/WalkingApp.Api/Friends/FriendService.cs`
**Lines**: 118-124
**Description**: In GetSentRequestsAsync, the response uses `RequesterDisplayName` and `RequesterAvatarUrl` fields but populates them with the addressee's profile data. This is semantically confusing even though it may be functionally correct for displaying who the request was sent to.

**Code**:
```csharp
var addresseeProfile = await _userRepository.GetByIdAsync(friendship.AddresseeId);

responses.Add(new FriendRequestResponse
{
    Id = friendship.Id,
    RequesterId = friendship.RequesterId,
    RequesterDisplayName = addresseeProfile?.DisplayName ?? "Unknown",  // Confusing: uses addressee data
    RequesterAvatarUrl = addresseeProfile?.AvatarUrl,
    ...
});
```

**Suggestion**: Consider creating a separate DTO for sent requests (e.g., `SentFriendRequestResponse`) with appropriately named fields like `AddresseeDisplayName` and `AddresseeAvatarUrl`, or add addressee fields to the existing DTO. This improves code clarity and API usability.

#### Issue #8: NotImplementedException Could Return 503 Instead of 501
**File**: `/mnt/c/Users/rene_/source/repos/walkingApp/WalkingApp.Api/Friends/FriendsController.cs`
**Lines**: 235-238
**Description**: The GetFriendSteps endpoint returns 501 Not Implemented for NotImplementedException. While technically correct, 503 Service Unavailable might be more appropriate since this is a temporary condition pending the Steps feature implementation, not a permanently unimplemented feature.

**Current**:
```csharp
catch (NotImplementedException ex)
{
    return StatusCode(501, ApiResponse<FriendStepsResponse>.ErrorResponse(ex.Message));
}
```

**Suggestion**: Consider using 503 with a Retry-After header or keeping 501 but documenting that this is temporary. Either approach is acceptable. The current implementation is clear enough with the XML comment noting the dependency on Plan 3.

## Code Smells Detected

1. **N+1 Query Pattern** (FriendService.cs lines 86-99, 116-129, 202-221): Multiple database calls in loops. This is a performance code smell that will not scale well as friend counts grow.

2. **Magic Number** (FriendRepository.cs line 266): The fallback to SendRequestAsync creates "pending" status when it should create "blocked". This reveals a logic bug rather than an intentional fallback.

3. **Potential Null Reference** (FriendService.cs line 211): The code checks `if (friendProfile != null)` before adding to the list, which means null profiles are silently skipped. While this prevents crashes, it could hide data integrity issues where friendships point to deleted users. Consider logging warnings for this case.

## Performance Concerns

1. **N+1 Queries**: As mentioned in Issues #1 and #2, the current implementation will make 1 + N database queries when fetching lists of friend requests or friends. For a user with 100 pending requests, this means 101 database queries instead of 2.

2. **No Pagination**: The GetFriendsAsync, GetPendingRequestsAsync, and GetSentRequestsAsync methods return all results without pagination. For users with hundreds of friends or requests, this could cause performance issues and excessive data transfer.

   **Suggestion**: Consider adding pagination parameters (page, pageSize) to these endpoints in a future iteration.

## Security Analysis

### RLS Policies
The RLS policies are generally well-designed and follow the principle of least privilege:
- Users can only view friendships they're part of
- Users can only send requests as themselves (not impersonate others)
- Only the addressee can accept/reject requests
- Either party can delete the friendship

**Strengths**:
- Proper use of auth.uid() for user identification
- Correct constraint preventing self-friendships
- Unique constraint preventing duplicate requests

**Concerns**:
- The UPDATE policy conflict with BlockUserAsync (Issue #5)
- The INSERT policy allows status='pending' only, which prevents direct blocking via INSERT

### Authentication
- All endpoints check for authenticated user via `User.GetUserId()`
- Missing `[Authorize]` attribute (Issue #6) but may be acceptable given middleware approach
- Repository correctly retrieves and validates Supabase token from HttpContext

### Authorization
- Service layer verifies friendship status before allowing operations
- Only addressee can accept/reject requests (verified in repository)
- Friend steps endpoint verifies accepted friendship before allowing access

## Positive Observations

1. **Excellent Test Coverage**: 78 comprehensive tests covering all scenarios including edge cases, error conditions, and business rules. Tests follow AAA pattern and are well-named.

2. **Clean Separation of Concerns**:
   - Controllers are thin and only handle HTTP concerns
   - Services contain all business logic and validation
   - Repositories only handle data access
   - Perfect adherence to the dependency direction

3. **Proper Error Handling**: Controllers catch specific exceptions and return appropriate HTTP status codes (400, 401, 404, 500).

4. **Guard Clauses**: Extensive use of guard clauses for parameter validation in services and repositories.

5. **XML Documentation**: All public APIs have comprehensive XML documentation.

6. **Immutability**: Domain models use appropriate nullability and readonly where practical.

7. **Dependency Injection**: All dependencies injected via constructor with proper null checks.

8. **Entity Mapping**: Clean separation between domain models (Friendship) and database entities (FriendshipEntity) with conversion methods.

9. **Status Parsing**: Safe enum parsing with clear error messages for unknown statuses.

10. **SQL Migration Quality**: Well-structured migration with proper indexes, constraints, comments, and execution instructions.

11. **Feature Independence**: Friends feature properly depends on Users via IUserRepository interface, maintaining loose coupling.

12. **Intentional NotImplementedException**: GetFriendStepsAsync correctly throws NotImplementedException with clear documentation that it depends on Plan 3, rather than attempting a hacky workaround.

## Recommendation

**Status**: REVISE

The implementation demonstrates strong architectural design and comprehensive test coverage. However, there are 4 BLOCKER issues that must be addressed before approval:

1. N+1 query performance issues (Issues #1, #2)
2. Missing API endpoint (Issue #3)
3. Logic bug in BlockUserAsync (Issue #4)

Additionally, the MAJOR issues regarding RLS policy restrictiveness (Issue #5) and missing authorization attribute (Issue #6) should be addressed or explicitly justified.

**Next Steps**:
- [ ] Add batch user fetching method to IUserRepository to resolve N+1 queries
- [ ] Refactor GetPendingRequestsAsync, GetSentRequestsAsync, and GetFriendsAsync to use batch fetching
- [ ] Implement missing GET /api/friends/{friendId} endpoint
- [ ] Fix BlockUserAsync to create "blocked" status directly instead of calling SendRequestAsync
- [ ] Review and update RLS UPDATE policy to support blocking existing friendships
- [ ] Add [Authorize] attribute to FriendsController or document why it's not needed
- [ ] (Optional) Address MINOR issues #7 and #8 for improved clarity

---

> **USER ACCEPTANCE REQUIRED**: Before proceeding with revisions, the user must review and approve this assessment. The user may add additional requirements or modify priorities.

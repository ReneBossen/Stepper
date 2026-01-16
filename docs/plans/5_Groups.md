# Plan 5: Groups Feature

## Summary

This plan implements the Groups feature for competitive walking challenges. Users can create groups, invite others to join, and compete on leaderboards. Groups support competition periods (weekly, monthly, custom) with aggregate step tracking. This is the most complex feature as it involves group management, membership, and leaderboard calculations.

## Affected Feature Slices

- **Groups**: Complete vertical slice (Controller, Service, Repository, Models, DTOs)
- **Common**: Uses shared infrastructure from Plan 1

## Proposed Types

| Type Name | Feature/Location | Responsibility |
|-----------|------------------|----------------|
| GroupsController | Groups/ | HTTP endpoints for group operations |
| IGroupService | Groups/ | Interface for group business logic |
| GroupService | Groups/ | Group management and leaderboard logic |
| IGroupRepository | Groups/ | Interface for group data access |
| GroupRepository | Groups/ | Supabase data access for groups |
| Group | Groups/ | Domain model for group |
| GroupMembership | Groups/ | Domain model for user-group relationship |
| CompetitionPeriod | Groups/ | Domain model for competition timeframe |
| LeaderboardEntry | Groups/ | Domain model for leaderboard position |
| MemberRole | Groups/ | Enum: Owner, Admin, Member |
| CreateGroupRequest | Groups/DTOs | Request DTO for group creation |
| UpdateGroupRequest | Groups/DTOs | Request DTO for group updates |
| GroupResponse | Groups/DTOs | Response DTO for group info |
| GroupListResponse | Groups/DTOs | Response DTO for user's groups |
| GroupMemberResponse | Groups/DTOs | Response DTO for member info |
| LeaderboardResponse | Groups/DTOs | Response DTO for leaderboard |
| JoinGroupRequest | Groups/DTOs | Request DTO for joining |
| InviteMemberRequest | Groups/DTOs | Request DTO for inviting |
| CompetitionPeriodType | Groups/ | Enum: Daily, Weekly, Monthly, Custom |

## Implementation Steps

1. **Create Groups folder structure**:
   ```
   WalkingApp.Api/Groups/
   ├── GroupsController.cs
   ├── IGroupService.cs
   ├── GroupService.cs
   ├── IGroupRepository.cs
   ├── GroupRepository.cs
   ├── Group.cs
   ├── GroupMembership.cs
   ├── CompetitionPeriod.cs
   ├── LeaderboardEntry.cs
   ├── MemberRole.cs
   ├── CompetitionPeriodType.cs
   └── DTOs/
       ├── CreateGroupRequest.cs
       ├── UpdateGroupRequest.cs
       ├── GroupResponse.cs
       ├── GroupListResponse.cs
       ├── GroupMemberResponse.cs
       ├── LeaderboardResponse.cs
       ├── JoinGroupRequest.cs
       └── InviteMemberRequest.cs
   ```

2. **Define enums**:
   ```csharp
   public enum MemberRole { Owner, Admin, Member }
   public enum CompetitionPeriodType { Daily, Weekly, Monthly, Custom }
   ```

3. **Define Group domain model**:
   ```csharp
   public class Group
   {
       public Guid Id { get; set; }
       public string Name { get; set; }
       public string? Description { get; set; }
       public Guid CreatedById { get; set; }
       public bool IsPublic { get; set; }
       public string? JoinCode { get; set; }  // For private groups
       public CompetitionPeriodType PeriodType { get; set; }
       public DateTime CreatedAt { get; set; }
       public int MemberCount { get; set; }
   }
   ```

4. **Define GroupMembership domain model**:
   ```csharp
   public class GroupMembership
   {
       public Guid Id { get; set; }
       public Guid GroupId { get; set; }
       public Guid UserId { get; set; }
       public MemberRole Role { get; set; }
       public DateTime JoinedAt { get; set; }
   }
   ```

5. **Define LeaderboardEntry**:
   ```csharp
   public class LeaderboardEntry
   {
       public int Rank { get; set; }
       public Guid UserId { get; set; }
       public string DisplayName { get; set; }
       public string? AvatarUrl { get; set; }
       public int TotalSteps { get; set; }
       public double TotalDistanceMeters { get; set; }
   }
   ```

6. **Define DTOs**:
   - `CreateGroupRequest`: Name, Description, IsPublic, PeriodType
   - `UpdateGroupRequest`: Name, Description, IsPublic
   - `GroupResponse`: Id, Name, Description, IsPublic, PeriodType, MemberCount, JoinCode, Role
   - `GroupListResponse`: Groups (list)
   - `GroupMemberResponse`: UserId, DisplayName, AvatarUrl, Role, JoinedAt
   - `LeaderboardResponse`: GroupId, PeriodStart, PeriodEnd, Entries (list)
   - `JoinGroupRequest`: JoinCode (for private groups)
   - `InviteMemberRequest`: UserId

7. **Implement IGroupRepository and GroupRepository**:
   - `CreateAsync(Group group)` - Create group
   - `GetByIdAsync(Guid groupId)` - Get group details
   - `GetUserGroupsAsync(Guid userId)` - Get groups user belongs to
   - `UpdateAsync(Group group)` - Update group
   - `DeleteAsync(Guid groupId)` - Delete group
   - `GetMembersAsync(Guid groupId)` - Get group members
   - `AddMemberAsync(GroupMembership membership)` - Add member
   - `RemoveMemberAsync(Guid groupId, Guid userId)` - Remove member
   - `UpdateMemberRoleAsync(Guid groupId, Guid userId, MemberRole role)` - Change role
   - `GetByJoinCodeAsync(string joinCode)` - Find by join code
   - `GetLeaderboardAsync(Guid groupId, DateRange period)` - Calculate leaderboard

8. **Implement IGroupService and GroupService**:
   - `CreateGroupAsync(Guid userId, CreateGroupRequest request)` - Create group
   - `GetGroupAsync(Guid userId, Guid groupId)` - Get group if member
   - `GetUserGroupsAsync(Guid userId)` - List user's groups
   - `UpdateGroupAsync(Guid userId, Guid groupId, UpdateGroupRequest request)` - Update (admin+)
   - `DeleteGroupAsync(Guid userId, Guid groupId)` - Delete (owner only)
   - `JoinGroupAsync(Guid userId, Guid groupId, JoinGroupRequest request)` - Join group
   - `LeaveGroupAsync(Guid userId, Guid groupId)` - Leave group
   - `InviteMemberAsync(Guid userId, Guid groupId, InviteMemberRequest request)` - Invite (admin+)
   - `RemoveMemberAsync(Guid userId, Guid groupId, Guid targetUserId)` - Remove (admin+)
   - `GetMembersAsync(Guid userId, Guid groupId)` - List members
   - `GetLeaderboardAsync(Guid userId, Guid groupId)` - Get current leaderboard
   - `RegenerateJoinCodeAsync(Guid userId, Guid groupId)` - New join code (admin+)
   - Validation: Name length, member limits, role checks

9. **Implement GroupsController**:
   - `POST /api/groups` - Create group
   - `GET /api/groups` - Get user's groups
   - `GET /api/groups/{id}` - Get group details
   - `PUT /api/groups/{id}` - Update group
   - `DELETE /api/groups/{id}` - Delete group
   - `POST /api/groups/{id}/join` - Join group
   - `POST /api/groups/{id}/leave` - Leave group
   - `GET /api/groups/{id}/members` - List members
   - `POST /api/groups/{id}/members` - Invite member
   - `DELETE /api/groups/{id}/members/{userId}` - Remove member
   - `GET /api/groups/{id}/leaderboard` - Get leaderboard
   - `POST /api/groups/{id}/regenerate-code` - Regenerate join code
   - All endpoints require authentication

10. **Register services** in Program.cs or ServiceCollectionExtensions

11. **Create Supabase migration** for groups and group_memberships tables:
    ```sql
    -- Groups table
    CREATE TABLE groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 50),
        description TEXT,
        created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        is_public BOOLEAN NOT NULL DEFAULT false,
        join_code TEXT UNIQUE,
        period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'custom')),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_groups_join_code ON groups(join_code) WHERE join_code IS NOT NULL;
    CREATE INDEX idx_groups_is_public ON groups(is_public);

    -- Group memberships table
    CREATE TABLE group_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
        joined_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_group_membership UNIQUE (group_id, user_id)
    );

    CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);
    CREATE INDEX idx_group_memberships_group ON group_memberships(group_id);
    ```

12. **Create RLS policies** for groups table:
    ```sql
    -- Enable RLS
    ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

    -- Anyone can view public groups
    CREATE POLICY "Anyone can view public groups"
        ON groups FOR SELECT
        USING (is_public = true);

    -- Members can view their groups
    CREATE POLICY "Members can view their groups"
        ON groups FOR SELECT
        USING (
            id IN (
                SELECT group_id FROM group_memberships
                WHERE user_id = auth.uid()
            )
        );

    -- Authenticated users can create groups
    CREATE POLICY "Users can create groups"
        ON groups FOR INSERT
        WITH CHECK (auth.uid() = created_by_id);

    -- Owner/Admin can update groups
    CREATE POLICY "Admins can update groups"
        ON groups FOR UPDATE
        USING (
            id IN (
                SELECT group_id FROM group_memberships
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            )
        );

    -- Only owner can delete group
    CREATE POLICY "Owner can delete group"
        ON groups FOR DELETE
        USING (
            id IN (
                SELECT group_id FROM group_memberships
                WHERE user_id = auth.uid() AND role = 'owner'
            )
        );
    ```

13. **Create RLS policies** for group_memberships table:
    ```sql
    -- Enable RLS
    ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

    -- Members can view memberships in their groups
    CREATE POLICY "Members can view group memberships"
        ON group_memberships FOR SELECT
        USING (
            group_id IN (
                SELECT group_id FROM group_memberships
                WHERE user_id = auth.uid()
            )
        );

    -- Users can join public groups or via join code (handled in service)
    CREATE POLICY "Users can join groups"
        ON group_memberships FOR INSERT
        WITH CHECK (auth.uid() = user_id);

    -- Users can leave groups (delete own membership)
    CREATE POLICY "Users can leave groups"
        ON group_memberships FOR DELETE
        USING (auth.uid() = user_id);

    -- Admins can remove members
    CREATE POLICY "Admins can manage members"
        ON group_memberships FOR DELETE
        USING (
            group_id IN (
                SELECT group_id FROM group_memberships
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            )
        );
    ```

14. **Create leaderboard function**:
    ```sql
    CREATE OR REPLACE FUNCTION get_group_leaderboard(
        p_group_id UUID,
        p_start_date DATE,
        p_end_date DATE
    )
    RETURNS TABLE (
        rank BIGINT,
        user_id UUID,
        display_name TEXT,
        avatar_url TEXT,
        total_steps BIGINT,
        total_distance_meters DOUBLE PRECISION
    )
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $$
        SELECT
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(se.step_count), 0) DESC) as rank,
            gm.user_id,
            u.display_name,
            u.avatar_url,
            COALESCE(SUM(se.step_count), 0) as total_steps,
            COALESCE(SUM(se.distance_meters), 0) as total_distance_meters
        FROM group_memberships gm
        JOIN users u ON u.id = gm.user_id
        LEFT JOIN step_entries se ON se.user_id = gm.user_id
            AND se.date BETWEEN p_start_date AND p_end_date
        WHERE gm.group_id = p_group_id
        GROUP BY gm.user_id, u.display_name, u.avatar_url
        ORDER BY total_steps DESC;
    $$;
    ```

15. **Create function for competition period calculation**:
    ```sql
    CREATE OR REPLACE FUNCTION get_competition_period_dates(
        p_period_type TEXT,
        p_reference_date DATE DEFAULT CURRENT_DATE
    )
    RETURNS TABLE (start_date DATE, end_date DATE)
    LANGUAGE sql
    IMMUTABLE
    AS $$
        SELECT
            CASE p_period_type
                WHEN 'daily' THEN p_reference_date
                WHEN 'weekly' THEN date_trunc('week', p_reference_date)::DATE
                WHEN 'monthly' THEN date_trunc('month', p_reference_date)::DATE
                ELSE p_reference_date
            END as start_date,
            CASE p_period_type
                WHEN 'daily' THEN p_reference_date
                WHEN 'weekly' THEN (date_trunc('week', p_reference_date) + INTERVAL '6 days')::DATE
                WHEN 'monthly' THEN (date_trunc('month', p_reference_date) + INTERVAL '1 month - 1 day')::DATE
                ELSE p_reference_date
            END as end_date;
    $$;
    ```

## Dependencies

- Plan 1 (Supabase Integration) must be completed first
- Plan 2 (Users) must be completed for member profiles
- Plan 3 (Steps) must be completed for leaderboard calculations
- No additional NuGet packages required

## Database Changes

**New Table**: `groups`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name | TEXT | NOT NULL, CHECK length 2-50 |
| description | TEXT | nullable |
| created_by_id | UUID | NOT NULL, REFERENCES auth.users(id) |
| is_public | BOOLEAN | NOT NULL, DEFAULT false |
| join_code | TEXT | UNIQUE, nullable |
| period_type | TEXT | NOT NULL, CHECK IN (daily, weekly, monthly, custom) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**New Table**: `group_memberships`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| group_id | UUID | NOT NULL, REFERENCES groups(id) |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) |
| role | TEXT | NOT NULL, CHECK IN (owner, admin, member) |
| joined_at | TIMESTAMPTZ | DEFAULT NOW() |

**Unique Constraint**: (group_id, user_id)

## Tests

**Unit Tests** (WalkingApp.UnitTests/Groups/):
- `GroupServiceTests`
  - Test creating group makes user owner
  - Test join code generated for private groups
  - Test joining public group succeeds
  - Test joining private group requires valid code
  - Test only admins can invite members
  - Test only owner can delete group
  - Test leaderboard calculation is correct
  - Test member count updates correctly

**Integration Tests** (WalkingApp.Api.Tests/Groups/):
- `GroupsControllerTests`
  - POST /api/groups creates group
  - GET /api/groups returns user's groups
  - POST /api/groups/{id}/join allows public group join
  - POST /api/groups/{id}/join requires code for private
  - GET /api/groups/{id}/leaderboard returns ranked members
  - DELETE /api/groups/{id} only works for owner
  - Cannot view non-member group (RLS)

**Architecture Tests**:
- Groups feature does not have circular dependencies
- Controller only depends on Service interface

## Acceptance Criteria

- [ ] groups and group_memberships tables are created
- [ ] RLS policies correctly restrict access
- [ ] Users can create groups (become owner)
- [ ] Private groups have join codes
- [ ] Users can join public groups
- [ ] Users can join private groups with valid code
- [ ] Owners can update and delete groups
- [ ] Admins can manage members
- [ ] Leaderboard shows ranked members with step totals
- [ ] Leaderboard respects competition period (daily/weekly/monthly)
- [ ] Users can leave groups
- [ ] Owner cannot leave without transferring ownership
- [ ] Member count is tracked correctly

## Risks and Open Questions

| Risk/Question | Mitigation/Answer |
|--------------|-------------------|
| Maximum group size | Start with 100 members, can increase later |
| Join code security | Use cryptographically random 8-char codes |
| Ownership transfer | Allow owner to promote admin, then leave |
| Historical leaderboards | Store snapshots or calculate on-demand (on-demand for MVP) |
| Inactive member handling | Not implementing initially |
| Competition prizes/badges | Future feature |

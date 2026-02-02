# Database Technical Debt

**Date**: 2026-02-02
**Author**: Architecture Engineer Agent

---

## Summary

| Priority | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 2 |
| Low | 1 |
| **Total** | **5** |

---

## High Priority

### [DB-001] Missing Indexes on Frequently Queried Columns

**Priority**: High
**Area**: Database
**Effort**: Small

**What is it:**
Several columns that are frequently used in WHERE clauses and joins may not have appropriate indexes:

1. `step_entries.date` - Used in date range queries
2. `step_entries.source` - Used in delete by source operations
3. `friendships.status` - Used in friendship status queries
4. `group_memberships.role` - Used in permission checks
5. `activity_feed.created_at` - Used for sorting activity items

**Why it's debt:**
- Queries may perform full table scans
- Performance degrades as data grows
- N+1 query patterns exacerbated by missing indexes
- Users with lots of data will experience slow queries

**How to fix:**
1. Analyze query patterns with EXPLAIN ANALYZE
2. Create composite indexes for common query patterns:
   - `CREATE INDEX idx_step_entries_user_date ON step_entries(user_id, date)`
   - `CREATE INDEX idx_step_entries_user_source ON step_entries(user_id, source)`
   - `CREATE INDEX idx_friendships_status ON friendships(status) WHERE status = 'pending'`
3. Monitor query performance after adding indexes
4. Add index documentation to DATABASE_SETUP.md

**Files affected:**
- supabase/migrations/ (new migration required)
- docs/DATABASE_SETUP.md

---

### [DB-002] RLS Policy Security at API Layer for Join Codes

**Priority**: High
**Area**: Database
**Effort**: Medium

**What is it:**
The groups table has an open SELECT policy ("Authenticated users can view any group") because join codes need to be accessible for the join-by-code feature. Security for join codes is handled at the API layer instead of RLS.

From migration comment:
> "The join_code field is already protected at the API layer (only owners/admins see it in API responses)"

**Why it's debt:**
- Defense in depth is weakened
- Any authenticated user can see all join codes by querying directly
- Relies on API layer always being used (bypasses possible)
- Security responsibility split between layers

**How to fix:**
1. Option A: Create a database function that returns groups with join codes masked:
   - Return `join_code` only if user is owner/admin of that group
   - Use security definer function
2. Option B: Move join codes to separate table with stricter RLS:
   - `group_join_codes` table
   - RLS allows only owners/admins to SELECT
3. Option C: Accept risk and document the security model clearly

**Files affected:**
- supabase/migrations/20260127130000_open_groups_select_policy.sql
- Stepper.Api/Groups/GroupService.cs (MapToGroupResponseAsync method)
- New migration if fixing

---

## Medium Priority

### [DB-003] Inconsistent RLS Policy Naming

**Priority**: Medium
**Area**: Database
**Effort**: Small

**What is it:**
RLS policies across tables have inconsistent naming conventions:
- "Users can view own profile"
- "Anyone can discover users"
- "Authenticated users can view any group"
- "Members can view their groups" (dropped)

**Why it's debt:**
- Hard to audit security policies
- Inconsistent documentation
- Difficult to understand policy intent at a glance

**How to fix:**
1. Establish naming convention: `{table}_{operation}_{subject}_{condition}`
   - Example: `users_select_own_profile`
   - Example: `groups_select_authenticated_any`
2. Create migration to rename policies
3. Update migration documentation standards

**Files affected:**
- All supabase/migrations/*.sql files
- New migration for policy renames

---

### [DB-004] No Migration for Initial Schema

**Priority**: Medium
**Area**: Database
**Effort**: Large

**What is it:**
The migrations directory starts with `20260118200000_create_activity_feed_table.sql`. Core tables (users, step_entries, friendships, groups, group_memberships) appear to have been created before migration tracking began.

**Why it's debt:**
- Cannot recreate database from migrations alone
- New developers cannot understand full schema evolution
- No documentation of original schema decisions
- Difficult to set up new environments

**How to fix:**
1. Create a "baseline" migration that documents existing schema
2. Export current schema using `pg_dump --schema-only`
3. Create `00000000000000_baseline.sql` with full schema
4. Add comment explaining this captures pre-migration state
5. Ensure fresh setups run baseline first

**Files affected:**
- supabase/migrations/ (new baseline migration)
- docs/DATABASE_SETUP.md

---

## Low Priority

### [DB-005] Magic Strings for Privacy Settings

**Priority**: Low
**Area**: Database
**Effort**: Small

**What is it:**
Privacy settings use string values ('public', 'private', 'friends') without database-level constraints:

```sql
WHERE up.privacy_find_me = 'private'
```

**Why it's debt:**
- Typos in application code won't be caught
- No database-level validation of allowed values
- Documentation of valid values only in code

**How to fix:**
1. Create ENUM type for privacy settings:
   ```sql
   CREATE TYPE privacy_level AS ENUM ('public', 'friends', 'private');
   ```
2. Or add CHECK constraint to column
3. Update column type with migration
4. Document valid values in schema comments

**Files affected:**
- supabase/migrations/ (new migration required)
- Stepper.Api/Users/UserPreferencesEntity.cs

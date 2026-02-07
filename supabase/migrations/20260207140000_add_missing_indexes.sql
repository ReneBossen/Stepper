-- Migration: Add missing indexes for frequently queried columns (DB-001)
-- Description: Adds composite and single-column indexes on friendships, step_entries,
--              group_memberships, and groups tables to improve query performance for
--              common access patterns identified in the repository layer and RLS policies.
-- Author: Database Engineer Agent
-- Date: 2026-02-07

-- ============================================================================
-- FRIENDSHIPS TABLE INDEXES
-- ============================================================================

-- Optimizes: GetPendingRequestsAsync, GetFriendsAsync (addressee side)
-- Queries filter by (addressee_id, status) frequently to find pending/accepted friendships
-- Also used by RLS policies on activity_feed that check friendship status
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id_status
    ON friendships(addressee_id, status);

-- Optimizes: GetSentRequestsAsync, GetFriendsAsync (requester side)
-- Queries filter by (requester_id, status) frequently to find pending/accepted friendships
-- Also used by RLS policies on activity_feed that check friendship status
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id_status
    ON friendships(requester_id, status);

-- Optimizes: GetFriendshipAsync (lookup by both participants)
-- Queries check both directions: (requester_id, addressee_id) and (addressee_id, requester_id)
-- The two composite indexes above already cover the first column of each direction,
-- but this dedicated index on (requester_id, addressee_id) allows efficient exact-pair lookups
-- without scanning all rows for a given requester
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id_addressee_id
    ON friendships(requester_id, addressee_id);

-- ============================================================================
-- STEP_ENTRIES TABLE INDEXES
-- ============================================================================

-- Optimizes: GetByDateAsync, FindExistingEntryAsync (upsert), GetByDateRangeAsync
-- The most common query pattern filters by (user_id, date) for daily step lookups
-- Also supports range queries on date for the same user (date is second column)
CREATE INDEX IF NOT EXISTS idx_step_entries_user_id_date
    ON step_entries(user_id, date);

-- Optimizes: GetByDateAsync ordering, GetByDateRangeAsync ordering
-- Queries frequently ORDER BY recorded_at DESC after filtering by user_id
-- Composite index enables index-ordered scans without a separate sort step
CREATE INDEX IF NOT EXISTS idx_step_entries_user_id_recorded_at
    ON step_entries(user_id, recorded_at DESC);

-- Optimizes: DeleteBySourceAsync
-- Queries filter by (user_id, source) to find and delete entries from a specific source
CREATE INDEX IF NOT EXISTS idx_step_entries_user_id_source
    ON step_entries(user_id, source);

-- ============================================================================
-- GROUP_MEMBERSHIPS TABLE INDEXES
-- ============================================================================

-- Optimizes: GetUserGroupsAsync, get_user_group_ids() SECURITY DEFINER function,
--            FetchUserMembershipsAsync, GetUserGroupMembershipsWithDetailsAsync
-- The user_id column is the most frequently queried column on this table
-- Also critical for RLS policy evaluation via get_user_group_ids(p_user_id)
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id
    ON group_memberships(user_id);

-- Optimizes: is_group_member(), is_group_admin(), is_group_owner() SECURITY DEFINER functions,
--            GetMembershipAsync, RemoveMemberAsync, UpdateMemberRoleAsync
-- These functions are called on every RLS policy evaluation for group-related tables,
-- making this index critical for overall group query performance
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id_user_id
    ON group_memberships(group_id, user_id);

-- ============================================================================
-- GROUPS TABLE INDEXES
-- ============================================================================

-- Optimizes: SearchPublicGroupsAsync, GetPublicGroupsAsync
-- Although is_public is boolean (low cardinality), a partial index on public groups
-- is appropriate because queries specifically filter WHERE is_public = true and
-- only a subset of groups are expected to be public. This allows efficient scans
-- of only public groups without touching private group rows.
CREATE INDEX IF NOT EXISTS idx_groups_is_public
    ON groups(id)
    WHERE is_public = true;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify indexes were created:
--
-- SELECT indexname, tablename, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename IN ('friendships', 'step_entries', 'group_memberships', 'groups')
-- ORDER BY tablename, indexname;

-- Migration: Fix group_memberships RLS infinite recursion
-- Description: Fixes infinite recursion in RLS policies for group_memberships and groups tables.
--              The original policies referenced group_memberships from within policies on
--              group_memberships itself, causing PostgreSQL to infinitely recurse when
--              evaluating the policy conditions.
-- Author: Database Engineer Agent
-- Date: 2026-01-24
--
-- Root Cause:
-- In migration 006_create_groups_tables.sql, several RLS policies on group_memberships
-- contain subqueries that SELECT from group_memberships:
--
--   CREATE POLICY "Members can view group memberships"
--       ON group_memberships FOR SELECT
--       USING (
--           group_id IN (
--               SELECT group_id FROM group_memberships  -- RECURSIVE!
--               WHERE user_id = auth.uid()
--           )
--       );
--
-- When PostgreSQL tries to evaluate this policy, it needs to SELECT from group_memberships,
-- which triggers the same policy again, causing infinite recursion.
--
-- Solution:
-- Create SECURITY DEFINER helper functions that bypass RLS to check membership/admin status.
-- These functions run with the privileges of the function creator (bypassing RLS) and can
-- safely query group_memberships without triggering policy evaluation.
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the policies were updated successfully
-- 8. Test: SELECT * FROM group_memberships LIMIT 1;

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- Function: Check if a user is a member of a specific group
-- Returns TRUE if the user is a member (any role), FALSE otherwise
-- SECURITY DEFINER ensures this bypasses RLS when called
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM group_memberships
        WHERE group_id = p_group_id AND user_id = p_user_id
    );
$$;

COMMENT ON FUNCTION is_group_member(UUID, UUID) IS
    'Checks if a user is a member of a group (any role). '
    'SECURITY DEFINER allows this to bypass RLS for policy evaluation.';

-- Function: Get all group IDs that a user is a member of
-- Returns a set of UUIDs representing all groups the user belongs to
-- SECURITY DEFINER ensures this bypasses RLS when called
CREATE OR REPLACE FUNCTION get_user_group_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT group_id FROM group_memberships WHERE user_id = p_user_id;
$$;

COMMENT ON FUNCTION get_user_group_ids(UUID) IS
    'Returns all group IDs that a user is a member of. '
    'SECURITY DEFINER allows this to bypass RLS for policy evaluation.';

-- Function: Check if a user is an admin (owner or admin role) of a specific group
-- Returns TRUE if the user has owner or admin role, FALSE otherwise
-- SECURITY DEFINER ensures this bypasses RLS when called
CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM group_memberships
        WHERE group_id = p_group_id
        AND user_id = p_user_id
        AND role IN ('owner', 'admin')
    );
$$;

COMMENT ON FUNCTION is_group_admin(UUID, UUID) IS
    'Checks if a user is an admin (owner or admin role) of a group. '
    'SECURITY DEFINER allows this to bypass RLS for policy evaluation.';

-- Function: Check if a user is the owner of a specific group
-- Returns TRUE if the user has owner role, FALSE otherwise
-- SECURITY DEFINER ensures this bypasses RLS when called
CREATE OR REPLACE FUNCTION is_group_owner(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM group_memberships
        WHERE group_id = p_group_id
        AND user_id = p_user_id
        AND role = 'owner'
    );
$$;

COMMENT ON FUNCTION is_group_owner(UUID, UUID) IS
    'Checks if a user is the owner of a group. '
    'SECURITY DEFINER allows this to bypass RLS for policy evaluation.';

-- ============================================================================
-- DROP EXISTING PROBLEMATIC POLICIES ON group_memberships
-- ============================================================================

-- Drop policies that cause infinite recursion
DROP POLICY IF EXISTS "Members can view group memberships" ON group_memberships;
DROP POLICY IF EXISTS "Admins can manage members" ON group_memberships;
DROP POLICY IF EXISTS "Admins can update member roles" ON group_memberships;

-- ============================================================================
-- DROP EXISTING PROBLEMATIC POLICIES ON groups
-- ============================================================================

-- Drop policies that reference group_memberships (these cause recursion when
-- the group_memberships policies also reference group_memberships)
DROP POLICY IF EXISTS "Members can view their groups" ON groups;
DROP POLICY IF EXISTS "Admins can update groups" ON groups;
DROP POLICY IF EXISTS "Owner can delete group" ON groups;

-- ============================================================================
-- NEW RLS POLICIES ON group_memberships (using helper functions)
-- ============================================================================

-- Policy: Members can view memberships in their groups
-- Uses get_user_group_ids() to avoid recursion
CREATE POLICY "Members can view group memberships"
    ON group_memberships FOR SELECT
    USING (
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

COMMENT ON POLICY "Members can view group memberships" ON group_memberships IS
    'Allows users to view all memberships in groups they belong to. '
    'Uses get_user_group_ids() SECURITY DEFINER function to avoid RLS recursion.';

-- Policy: Admins can remove members from their groups
-- Uses is_group_admin() to avoid recursion
-- Note: "Users can leave groups" policy (user_id = auth.uid()) remains unchanged
CREATE POLICY "Admins can manage members"
    ON group_memberships FOR DELETE
    USING (
        is_group_admin(group_id, auth.uid())
    );

COMMENT ON POLICY "Admins can manage members" ON group_memberships IS
    'Allows group owners and admins to remove any member from the group. '
    'Uses is_group_admin() SECURITY DEFINER function to avoid RLS recursion.';

-- Policy: Admins can update member roles
-- Uses is_group_admin() to avoid recursion
CREATE POLICY "Admins can update member roles"
    ON group_memberships FOR UPDATE
    USING (
        is_group_admin(group_id, auth.uid())
    )
    WITH CHECK (
        is_group_admin(group_id, auth.uid())
    );

COMMENT ON POLICY "Admins can update member roles" ON group_memberships IS
    'Allows group owners and admins to update member roles (e.g., promote to admin). '
    'Uses is_group_admin() SECURITY DEFINER function to avoid RLS recursion.';

-- ============================================================================
-- NEW RLS POLICIES ON groups (using helper functions)
-- ============================================================================

-- Policy: Members can view their groups (both public and private)
-- Uses is_group_member() to avoid recursion
CREATE POLICY "Members can view their groups"
    ON groups FOR SELECT
    USING (
        is_group_member(id, auth.uid())
    );

COMMENT ON POLICY "Members can view their groups" ON groups IS
    'Allows users to view groups they are members of (regardless of is_public setting). '
    'Uses is_group_member() SECURITY DEFINER function to avoid RLS recursion.';

-- Policy: Owner/Admin can update groups
-- Uses is_group_admin() to avoid recursion
CREATE POLICY "Admins can update groups"
    ON groups FOR UPDATE
    USING (
        is_group_admin(id, auth.uid())
    )
    WITH CHECK (
        is_group_admin(id, auth.uid())
    );

COMMENT ON POLICY "Admins can update groups" ON groups IS
    'Allows group owners and admins to update group settings (name, description, etc.). '
    'Uses is_group_admin() SECURITY DEFINER function to avoid RLS recursion.';

-- Policy: Only owner can delete group
-- Uses is_group_owner() to avoid recursion
CREATE POLICY "Owner can delete group"
    ON groups FOR DELETE
    USING (
        is_group_owner(id, auth.uid())
    );

COMMENT ON POLICY "Owner can delete group" ON groups IS
    'Only the group owner can delete the group. '
    'Uses is_group_owner() SECURITY DEFINER function to avoid RLS recursion.';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions on helper functions to authenticated users
-- These functions are used in RLS policies which run as the authenticated user
GRANT EXECUTE ON FUNCTION is_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_group_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_owner(UUID, UUID) TO authenticated;

-- Also grant to anon for cases where unauthenticated queries might occur
-- (though most group operations require authentication)
GRANT EXECUTE ON FUNCTION is_group_member(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_group_ids(UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_group_admin(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_group_owner(UUID, UUID) TO anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- After running this migration, test with:
--
-- -- Should return group memberships for groups the current user belongs to
-- SELECT * FROM group_memberships LIMIT 10;
--
-- -- Should return groups the current user is a member of
-- SELECT * FROM groups WHERE id IN (SELECT get_user_group_ids(auth.uid()));
--
-- -- Test helper functions directly
-- SELECT is_group_member('group-uuid-here', auth.uid());
-- SELECT is_group_admin('group-uuid-here', auth.uid());
-- SELECT get_user_group_ids(auth.uid());
--
-- -- Verify no recursion error
-- SELECT g.*, gm.role
-- FROM groups g
-- JOIN group_memberships gm ON gm.group_id = g.id
-- WHERE gm.user_id = auth.uid();

-- Migration: Move join_code to separate table with member-only RLS
-- Description: Moves the join_code column from the groups table to a dedicated
--              group_join_codes table with RLS restricting access to group members only.
--              Previously, any authenticated user could read all join codes via direct
--              Supabase queries because the groups SELECT policy was fully open.
-- Author: Database Engineer
-- Date: 2026-02-07
-- References: DB-002 technical debt item
--
-- Security Model:
--   SELECT: Only group members can read join codes (enables member-to-member invites)
--   INSERT: Only group owners can create codes
--   UPDATE: Only owners/admins can regenerate codes
--   DELETE: Only owners can delete codes
--
-- Uses existing SECURITY DEFINER functions from migration 20260124140000:
--   is_group_member(p_group_id, p_user_id)
--   is_group_admin(p_group_id, p_user_id)
--   is_group_owner(p_group_id, p_user_id)

-- ============================================================================
-- CREATE TABLE
-- ============================================================================

CREATE TABLE group_join_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    join_code VARCHAR(8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_group_join_codes_group_id UNIQUE (group_id)
);

COMMENT ON TABLE group_join_codes IS
    'Stores join codes for groups in a separate table with member-only RLS. '
    'One code per group (enforced by unique constraint on group_id).';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_group_join_codes_code ON group_join_codes(join_code);

COMMENT ON INDEX idx_group_join_codes_code IS
    'Fast lookup by join_code for the join-by-code flow.';

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE group_join_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- SELECT: Group members can read join codes (enables sharing invite codes with friends)
CREATE POLICY "Group members can view join code"
    ON group_join_codes FOR SELECT
    TO authenticated
    USING (is_group_member(group_id, auth.uid()));

COMMENT ON POLICY "Group members can view join code" ON group_join_codes IS
    'Only existing group members can read join codes. Uses is_group_member() '
    'SECURITY DEFINER function to avoid RLS recursion with group_memberships.';

-- INSERT: Only group owner can create a join code
CREATE POLICY "Group owner can create join code"
    ON group_join_codes FOR INSERT
    TO authenticated
    WITH CHECK (is_group_owner(group_id, auth.uid()));

COMMENT ON POLICY "Group owner can create join code" ON group_join_codes IS
    'Only the group owner can insert a join code row.';

-- UPDATE: Owners and admins can regenerate join codes
CREATE POLICY "Group admins can update join code"
    ON group_join_codes FOR UPDATE
    TO authenticated
    USING (is_group_admin(group_id, auth.uid()))
    WITH CHECK (is_group_admin(group_id, auth.uid()));

COMMENT ON POLICY "Group admins can update join code" ON group_join_codes IS
    'Group owners and admins can update (regenerate) the join code.';

-- DELETE: Only owner can delete the join code
CREATE POLICY "Group owner can delete join code"
    ON group_join_codes FOR DELETE
    TO authenticated
    USING (is_group_owner(group_id, auth.uid()));

COMMENT ON POLICY "Group owner can delete join code" ON group_join_codes IS
    'Only the group owner can delete the join code row.';

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- Copy existing join codes from groups table to the new table
INSERT INTO group_join_codes (group_id, join_code, created_at, updated_at)
SELECT id, join_code, created_at, NOW()
FROM groups
WHERE join_code IS NOT NULL;

-- ============================================================================
-- DROP OLD COLUMN
-- ============================================================================

ALTER TABLE groups DROP COLUMN IF EXISTS join_code;

-- ============================================================================
-- UPDATE TRIGGER (updated_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_group_join_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_join_codes_updated_at
    BEFORE UPDATE ON group_join_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_group_join_codes_updated_at();

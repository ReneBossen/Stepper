-- Migration: Harden groups RLS and add join_group_by_code RPC
-- Description: Closes several RLS gaps and introduces a SECURITY DEFINER RPC
--              for the join-by-code flow.
--
--              Gaps closed:
--                1. group_memberships.INSERT was `auth.uid() = user_id` with no
--                   role check, so any user could self-insert with role='owner'.
--                2. No way for a non-member to look up a group by join code
--                   (group_join_codes SELECT is member-only by design), which
--                   broke the join-by-code flow entirely.
--                3. groups.SELECT was wide open to all authenticated users.
--                4. Nothing prevented UPDATE from changing immutable fields
--                   (id, created_by_id, created_at).
--                5. No notion of pending membership for approval-required groups.
--
--              New model:
--                - group_memberships gains a status column ('active' | 'pending').
--                - Helper functions (is_group_member, is_group_admin, is_group_owner,
--                  get_user_group_ids) require status='active'.
--                - A new helper has_group_membership returns true for any status,
--                  used only by the groups SELECT policy so pending users can
--                  still see the group row they're waiting on.
--                - Direct INSERT on groups and group_memberships is revoked for
--                  authenticated. Group creation goes through
--                  create_group_with_owner (existing), join goes through
--                  join_group_by_code (new).
--                - Immutable columns on groups are enforced by a BEFORE UPDATE
--                  trigger.
-- Author: Claude
-- Date: 2026-04-13

-- ============================================================================
-- 1. ADD status COLUMN TO group_memberships
-- ============================================================================

ALTER TABLE group_memberships
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT chk_group_memberships_status CHECK (status IN ('active', 'pending'));

COMMENT ON COLUMN group_memberships.status IS
    'Membership status. ''active'' members have full access; ''pending'' members '
    'are waiting on admin approval in require_approval groups.';

CREATE INDEX IF NOT EXISTS idx_group_memberships_group_status
    ON group_memberships(group_id, status);

-- ============================================================================
-- 2. UPDATE HELPER FUNCTIONS TO REQUIRE status='active'
-- ============================================================================

CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
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
          AND status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION get_user_group_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT group_id FROM group_memberships
    WHERE user_id = p_user_id AND status = 'active';
$$;

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
          AND status = 'active'
          AND role IN ('owner', 'admin')
    );
$$;

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
          AND status = 'active'
          AND role = 'owner'
    );
$$;

-- New helper: returns true if the user has ANY membership row (active or pending).
-- Used only by the groups SELECT policy so pending users can still load the
-- group they are waiting on.
CREATE OR REPLACE FUNCTION has_group_membership(p_group_id UUID, p_user_id UUID)
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
    );
$$;

COMMENT ON FUNCTION has_group_membership(UUID, UUID) IS
    'Returns true for any membership row regardless of status. Used by the '
    'groups SELECT policy so pending members can still see the group row.';

GRANT EXECUTE ON FUNCTION has_group_membership(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_group_membership(UUID, UUID) TO anon;

-- ============================================================================
-- 3. REPLACE groups SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view any group" ON groups;

CREATE POLICY "Public or member groups are visible"
    ON groups FOR SELECT
    TO authenticated
    USING (
        is_public = true
        OR has_group_membership(id, auth.uid())
    );

COMMENT ON POLICY "Public or member groups are visible" ON groups IS
    'Authenticated users can see public groups and any group they have a '
    'membership row in (active or pending). Join-by-code lookups go through '
    'the join_group_by_code SECURITY DEFINER RPC, not direct SELECT.';

-- ============================================================================
-- 4. REVOKE DIRECT INSERT ON groups (force RPC)
-- ============================================================================

DROP POLICY IF EXISTS "Users can create groups" ON groups;

-- No INSERT policy on groups. The create_group_with_owner RPC is SECURITY
-- DEFINER and bypasses RLS, so authenticated users can still create groups
-- via that entry point.

-- ============================================================================
-- 5. groups IMMUTABLE COLUMNS TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION groups_prevent_immutable_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'groups.id is immutable' USING ERRCODE = '42501';
    END IF;
    IF NEW.created_by_id IS DISTINCT FROM OLD.created_by_id THEN
        RAISE EXCEPTION 'groups.created_by_id is immutable' USING ERRCODE = '42501';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'groups.created_at is immutable' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_groups_prevent_immutable_updates ON groups;
CREATE TRIGGER trg_groups_prevent_immutable_updates
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION groups_prevent_immutable_column_updates();

-- ============================================================================
-- 6. REVOKE DIRECT INSERT ON group_memberships (force RPC)
-- ============================================================================

DROP POLICY IF EXISTS "Users can join groups" ON group_memberships;

-- No INSERT policy. All membership inserts go through create_group_with_owner
-- (for owner at creation) or join_group_by_code (for new joiners). Both are
-- SECURITY DEFINER and bypass RLS.

-- ============================================================================
-- 7. group_memberships SELECT: ALSO ALLOW OWN ROW
-- ============================================================================

-- The existing "Members can view group memberships" policy uses
-- get_user_group_ids() which now filters to status='active'. A user with a
-- pending row would not see their own pending membership. Add a second SELECT
-- policy so users can always read their own row regardless of status.
-- (Multiple SELECT policies are OR'd together.)

CREATE POLICY "Users can view own memberships"
    ON group_memberships FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

COMMENT ON POLICY "Users can view own memberships" ON group_memberships IS
    'Users can always read their own membership rows, including pending ones '
    'awaiting approval. OR''d with "Members can view group memberships".';

-- ============================================================================
-- 8. UPDATE create_group_with_owner TO SET status='active' EXPLICITLY
-- ============================================================================

CREATE OR REPLACE FUNCTION create_group_with_owner(
    p_name VARCHAR,
    p_description TEXT,
    p_is_public BOOLEAN,
    p_period_type VARCHAR,
    p_max_members INT,
    p_join_code VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_group_id UUID := gen_random_uuid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    INSERT INTO groups (
        id, name, description, created_by_id, is_public,
        period_type, max_members, created_at
    )
    VALUES (
        v_group_id, p_name, p_description, v_user_id, p_is_public,
        p_period_type, p_max_members, NOW()
    );

    INSERT INTO group_memberships (id, group_id, user_id, role, status, joined_at)
    VALUES (gen_random_uuid(), v_group_id, v_user_id, 'owner', 'active', NOW());

    IF p_join_code IS NOT NULL AND length(p_join_code) > 0 THEN
        INSERT INTO group_join_codes (group_id, join_code)
        VALUES (v_group_id, p_join_code);
    END IF;

    RETURN v_group_id;
END;
$$;

-- ============================================================================
-- 9. join_group_by_code RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION join_group_by_code(p_code TEXT)
RETURNS TABLE (
    group_id UUID,
    membership_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_group_id UUID;
    v_require_approval BOOLEAN;
    v_max_members INT;
    v_active_count INT;
    v_existing_status TEXT;
    v_new_status TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF p_code IS NULL OR length(p_code) = 0 THEN
        RAISE EXCEPTION 'Join code is required' USING ERRCODE = '22023';
    END IF;

    -- Look up the group by code (bypasses RLS via SECURITY DEFINER)
    SELECT gjc.group_id INTO v_group_id
    FROM group_join_codes gjc
    WHERE gjc.join_code = p_code
    LIMIT 1;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Invalid join code' USING ERRCODE = 'P0002';
    END IF;

    -- Already a member?
    SELECT gm.status INTO v_existing_status
    FROM group_memberships gm
    WHERE gm.group_id = v_group_id AND gm.user_id = v_user_id;

    IF v_existing_status IS NOT NULL THEN
        RAISE EXCEPTION 'Already a member of this group (status: %)', v_existing_status
            USING ERRCODE = '23505';
    END IF;

    -- Load group policy fields
    SELECT g.require_approval, g.max_members
      INTO v_require_approval, v_max_members
    FROM groups g
    WHERE g.id = v_group_id;

    -- Enforce max_members (count active members only; pending don't consume a slot)
    SELECT COUNT(*)::INT INTO v_active_count
    FROM group_memberships
    WHERE group_memberships.group_id = v_group_id
      AND status = 'active';

    IF v_active_count >= v_max_members THEN
        RAISE EXCEPTION 'Group is full (max_members=%)', v_max_members
            USING ERRCODE = '23514';
    END IF;

    -- Decide status
    v_new_status := CASE WHEN v_require_approval THEN 'pending' ELSE 'active' END;

    INSERT INTO group_memberships (id, group_id, user_id, role, status, joined_at)
    VALUES (gen_random_uuid(), v_group_id, v_user_id, 'member', v_new_status, NOW());

    RETURN QUERY SELECT v_group_id, v_new_status;
END;
$$;

COMMENT ON FUNCTION join_group_by_code(TEXT) IS
    'Joins the caller to a group identified by its join code. SECURITY DEFINER '
    'bypasses RLS on group_join_codes (members-only SELECT) and group_memberships '
    '(no authenticated INSERT). Enforces max_members, already-member, and '
    'require_approval. Returns the group id and the resulting membership status '
    '(''active'' or ''pending'').';

GRANT EXECUTE ON FUNCTION join_group_by_code(TEXT) TO authenticated;

-- ============================================================================
-- 10. join_public_group RPC
-- ============================================================================

-- Joins a public group by id. Fails for private groups (which must be joined
-- via join_group_by_code). Enforces max_members and require_approval the same
-- way join_group_by_code does.

CREATE OR REPLACE FUNCTION join_public_group(p_group_id UUID)
RETURNS TABLE (
    group_id UUID,
    membership_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_public BOOLEAN;
    v_require_approval BOOLEAN;
    v_max_members INT;
    v_active_count INT;
    v_existing_status TEXT;
    v_new_status TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT g.is_public, g.require_approval, g.max_members
      INTO v_is_public, v_require_approval, v_max_members
    FROM groups g
    WHERE g.id = p_group_id;

    IF v_is_public IS NULL THEN
        RAISE EXCEPTION 'Group not found' USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_is_public THEN
        RAISE EXCEPTION 'Group is private; use join_group_by_code' USING ERRCODE = '42501';
    END IF;

    SELECT gm.status INTO v_existing_status
    FROM group_memberships gm
    WHERE gm.group_id = p_group_id AND gm.user_id = v_user_id;

    IF v_existing_status IS NOT NULL THEN
        RAISE EXCEPTION 'Already a member of this group (status: %)', v_existing_status
            USING ERRCODE = '23505';
    END IF;

    SELECT COUNT(*)::INT INTO v_active_count
    FROM group_memberships
    WHERE group_memberships.group_id = p_group_id
      AND status = 'active';

    IF v_active_count >= v_max_members THEN
        RAISE EXCEPTION 'Group is full (max_members=%)', v_max_members
            USING ERRCODE = '23514';
    END IF;

    v_new_status := CASE WHEN v_require_approval THEN 'pending' ELSE 'active' END;

    INSERT INTO group_memberships (id, group_id, user_id, role, status, joined_at)
    VALUES (gen_random_uuid(), p_group_id, v_user_id, 'member', v_new_status, NOW());

    RETURN QUERY SELECT p_group_id, v_new_status;
END;
$$;

COMMENT ON FUNCTION join_public_group(UUID) IS
    'Joins the caller to a public group. SECURITY DEFINER bypasses RLS on '
    'group_memberships. Rejects private groups. Enforces max_members, '
    'already-member, and require_approval. Returns the group id and the '
    'resulting membership status (''active'' or ''pending'').';

GRANT EXECUTE ON FUNCTION join_public_group(UUID) TO authenticated;

-- ============================================================================
-- 11. admin_add_member RPC
-- ============================================================================

-- Lets an owner/admin directly add a user to a group, bypassing the join code
-- and approval flow. Still enforces max_members and already-member checks.
-- The caller must be an active admin of the group.

CREATE OR REPLACE FUNCTION admin_add_member(p_group_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_max_members INT;
    v_active_count INT;
    v_existing_status TEXT;
    v_new_id UUID := gen_random_uuid();
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF NOT is_group_admin(p_group_id, v_caller) THEN
        RAISE EXCEPTION 'Only group owners and admins can add members'
            USING ERRCODE = '42501';
    END IF;

    SELECT g.max_members INTO v_max_members FROM groups g WHERE g.id = p_group_id;
    IF v_max_members IS NULL THEN
        RAISE EXCEPTION 'Group not found' USING ERRCODE = 'P0002';
    END IF;

    SELECT gm.status INTO v_existing_status
    FROM group_memberships gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id;

    IF v_existing_status IS NOT NULL THEN
        RAISE EXCEPTION 'User is already a member of this group (status: %)', v_existing_status
            USING ERRCODE = '23505';
    END IF;

    SELECT COUNT(*)::INT INTO v_active_count
    FROM group_memberships
    WHERE group_memberships.group_id = p_group_id AND status = 'active';

    IF v_active_count >= v_max_members THEN
        RAISE EXCEPTION 'Group is full (max_members=%)', v_max_members
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO group_memberships (id, group_id, user_id, role, status, joined_at)
    VALUES (v_new_id, p_group_id, p_user_id, 'member', 'active', NOW());

    RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION admin_add_member(UUID, UUID) IS
    'Lets an owner/admin directly add a user to a group as an active member. '
    'SECURITY DEFINER bypasses the group_memberships INSERT restriction. '
    'The caller must be an active admin of the group.';

GRANT EXECUTE ON FUNCTION admin_add_member(UUID, UUID) TO authenticated;

-- ============================================================================
-- 12. BACKFILL SAFETY
-- ============================================================================

-- Any rows that somehow bypassed the DEFAULT are forced to 'active'.
UPDATE group_memberships SET status = 'active' WHERE status IS NULL;

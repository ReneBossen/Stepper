-- Migration: Fix TOCTOU race condition in group join RPCs
-- Description: Adds FOR UPDATE to the SELECT on the groups row inside
--              join_group_by_code, join_public_group, and admin_add_member.
--
--              Problem:
--                Two concurrent join requests could both SELECT the active
--                member count, both see it below max_members, and both
--                INSERT — exceeding the limit by 1. PostgreSQL's default
--                READ COMMITTED isolation does not prevent this because
--                neither transaction holds a lock on the groups row.
--
--              Fix:
--                FOR UPDATE on the groups row serializes concurrent join
--                attempts for the same group. The second transaction blocks
--                at its own SELECT ... FOR UPDATE until the first commits,
--                then re-reads the row and sees the updated member count.
--
--              No deadlock risk — each RPC locks exactly one groups row
--              with no further lock acquisition. No performance impact —
--              single-row PK lock held for sub-millisecond.
--
--              No schema changes, no new GRANTs (already in place from
--              migration 20260413130000).
-- Author: Claude
-- Date: 2026-04-18

-- ============================================================================
-- 1. join_group_by_code — add FOR UPDATE to groups SELECT
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

    -- Load group policy fields.
    -- FOR UPDATE locks the groups row for the duration of this transaction,
    -- serializing concurrent join attempts and preventing a TOCTOU race
    -- on the max_members check.
    SELECT g.require_approval, g.max_members
      INTO v_require_approval, v_max_members
    FROM groups g
    WHERE g.id = v_group_id
    FOR UPDATE;

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

-- ============================================================================
-- 2. join_public_group — add FOR UPDATE to groups SELECT
-- ============================================================================

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

    -- FOR UPDATE locks the groups row for the duration of this transaction,
    -- serializing concurrent join attempts and preventing a TOCTOU race
    -- on the max_members check.
    SELECT g.is_public, g.require_approval, g.max_members
      INTO v_is_public, v_require_approval, v_max_members
    FROM groups g
    WHERE g.id = p_group_id
    FOR UPDATE;

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

-- ============================================================================
-- 3. admin_add_member — add FOR UPDATE to groups SELECT
-- ============================================================================

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

    -- FOR UPDATE locks the groups row for the duration of this transaction,
    -- serializing concurrent add-member attempts and preventing a TOCTOU race
    -- on the max_members check.
    SELECT g.max_members INTO v_max_members
    FROM groups g
    WHERE g.id = p_group_id
    FOR UPDATE;

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

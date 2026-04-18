-- Migration: Add leave_group RPC and drop self-service DELETE policy
-- Description: Closes a defense-in-depth gap on group_memberships DELETE.
--              The "Users can leave groups" policy (user_id = auth.uid())
--              let any member — including the owner — delete their own
--              membership row via a raw Supabase client call, bypassing the
--              service-layer check that prevents owners from orphaning groups
--              with other active members.
--
--              Gap closed:
--                Owner could bypass LeaveGroupAsync validation and directly
--                DELETE their membership row, orphaning the group.
--
--              New model:
--                - "Users can leave groups" DELETE policy dropped.
--                - New SECURITY DEFINER leave_group(p_group_id) RPC enforces:
--                  caller must be a member; if owner, must be the only active
--                  member. Mirrors the existing LeaveGroupAsync validation.
--                - "Admins can manage members" DELETE policy remains unchanged
--                  (admin kick path still works via direct DELETE).
-- Author: Claude
-- Date: 2026-04-18

-- ============================================================================
-- 1. DROP THE SELF-SERVICE DELETE POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Users can leave groups" ON group_memberships;

-- ============================================================================
-- 2. CREATE leave_group RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION leave_group(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_membership_id UUID;
    v_role TEXT;
    v_active_count INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF p_group_id IS NULL THEN
        RAISE EXCEPTION 'Group ID is required' USING ERRCODE = '22023';
    END IF;

    -- Look up the caller's membership
    SELECT gm.id, gm.role
      INTO v_membership_id, v_role
    FROM group_memberships gm
    WHERE gm.group_id = p_group_id AND gm.user_id = v_user_id;

    IF v_membership_id IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this group' USING ERRCODE = 'P0002';
    END IF;

    -- If owner, only allow leaving when sole active member
    IF v_role = 'owner' THEN
        SELECT COUNT(*)::INT INTO v_active_count
        FROM group_memberships
        WHERE group_memberships.group_id = p_group_id
          AND status = 'active';

        IF v_active_count > 1 THEN
            RAISE EXCEPTION 'Owner cannot leave without transferring ownership'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    DELETE FROM group_memberships
    WHERE id = v_membership_id;
END;
$$;

COMMENT ON FUNCTION leave_group(UUID) IS
    'Removes the caller from a group. SECURITY DEFINER bypasses the dropped '
    '"Users can leave groups" DELETE policy. Enforces: caller must be a member; '
    'if owner, must be the only active member (prevents orphaning groups). '
    'The admin-kick path ("Admins can manage members" DELETE policy) is unaffected.';

REVOKE EXECUTE ON FUNCTION leave_group(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION leave_group(UUID) TO authenticated;

-- Migration: Enforce privacy_show_steps on step_entries and activity_feed reads
-- Description: The user_preferences.privacy_show_steps column has existed
--              since 20260119150000 with values 'public' | 'partial' | 'private',
--              but no read path has ever consulted it. RLS on both step_entries
--              (20260418110000) and activity_feed (20260418130000) only checks
--              friendship status, so switching the setting to 'private' had no
--              observable effect — every accepted friend could still read both
--              tables.
--
--              This migration closes that gap:
--                1. Adds helper function can_view_user_steps(viewer, target)
--                   that short-circuits on self-view and otherwise resolves
--                   privacy_show_steps (defaulting to 'partial' when no
--                   preferences row exists, matching the column default).
--                2. Replaces the SELECT policy on step_entries with a single
--                   predicate that delegates to the helper.
--                3. Replaces the SELECT policy on activity_feed with the same
--                   predicate. This covers 'milestone', 'friend_achievement',
--                   and 'group_join' rows uniformly (product decision: treat
--                   the Recent Activity feed the same as step data).
--
--              get_group_leaderboard() is intentionally NOT changed. Group
--              membership implies consent to share steps with other members
--              of that group — a private user still shows up on leaderboards
--              of groups they joined, but their individual profile stats and
--              Home feed rows are hidden from non-self viewers.
--
--              Backend (.NET) and mobile are unchanged. Authenticated clients
--              read these tables through RLS with the caller's JWT, so
--              tightening the policy flows through naturally: private users'
--              step_entries disappear from profile stats queries, and their
--              activity_feed rows disappear from the Home feed query.
-- Author: Claude
-- Date: 2026-04-19

-- ============================================================================
-- 1. HELPER FUNCTION: can_view_user_steps
-- ============================================================================

-- Returns TRUE iff p_viewer is allowed to read step/activity data owned by
-- p_target according to the target's privacy_show_steps preference.
--
-- SECURITY DEFINER so the function can read user_preferences regardless of
-- the caller's RLS scope (user_preferences only allows SELECT on own rows).
-- search_path is pinned to public to block search-path hijacking, matching
-- the pattern established for get_friend_ids() in 20260418110000.
--
-- A missing user_preferences row is treated as 'partial' to match the
-- column default — preserves existing friend-visibility behavior for any
-- user who somehow lacks the auto-created row.

CREATE OR REPLACE FUNCTION can_view_user_steps(p_viewer UUID, p_target UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_privacy TEXT;
BEGIN
    -- Self-view: always allowed, short-circuit before any lookup.
    IF p_viewer = p_target THEN
        RETURN TRUE;
    END IF;

    SELECT privacy_show_steps INTO v_privacy
    FROM user_preferences
    WHERE id = p_target;

    -- No preferences row → treat as 'partial' (column default).
    IF v_privacy IS NULL THEN
        v_privacy := 'partial';
    END IF;

    IF v_privacy = 'public' THEN
        RETURN TRUE;
    ELSIF v_privacy = 'partial' THEN
        RETURN EXISTS (
            SELECT 1 FROM get_friend_ids(p_target) WHERE friend_id = p_viewer
        );
    ELSE
        -- 'private' (or any unexpected value, for defense in depth)
        RETURN FALSE;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION can_view_user_steps(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_view_user_steps(UUID, UUID) TO authenticated;

-- ============================================================================
-- 2. REPLACE step_entries SELECT POLICY
-- ============================================================================

-- Previous policy (20260418110000) allowed all accepted friends to SELECT,
-- ignoring privacy_show_steps. New policy delegates the entire decision to
-- can_view_user_steps. The helper short-circuits on self-view so own-row
-- reads stay cheap.

DROP POLICY IF EXISTS "Users can view own and friends steps" ON step_entries;

CREATE POLICY "Users can view steps respecting privacy"
    ON step_entries FOR SELECT
    TO authenticated
    USING (can_view_user_steps(auth.uid(), user_id));

-- ============================================================================
-- 3. REPLACE activity_feed SELECT POLICY
-- ============================================================================

-- Same rationale as step_entries. Covers milestone rows (which directly leak
-- step counts like "hit 10,000 steps today") and also friend_achievement /
-- group_join rows — user confirmed the entire feed should obey the same rule.

DROP POLICY IF EXISTS "Users can view own and friends activity" ON activity_feed;

CREATE POLICY "Users can view activity respecting privacy"
    ON activity_feed FOR SELECT
    TO authenticated
    USING (can_view_user_steps(auth.uid(), user_id));

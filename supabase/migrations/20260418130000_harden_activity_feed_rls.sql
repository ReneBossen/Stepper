-- Migration: Harden activity_feed RLS
-- Description: Closes gaps on the activity_feed table as part of the RLS
--              hardening sweep tracked in docs/plans/rls-policies-hardening.md.
--
--              Gaps closed:
--                1. INSERT policy allowed any authenticated user to insert
--                   their own activity rows, but all legitimate inserts come
--                   from three SECURITY DEFINER triggers that bypass RLS.
--                   No backend or mobile code ever writes directly.
--                2. INSERT grant to authenticated was unnecessary (same
--                   rationale). UPDATE/DELETE grants revoked for
--                   defense-in-depth — no policies or code paths use them.
--                3. Friends SELECT policy used an inline CASE/WHEN subquery
--                   duplicating get_friend_ids() logic. Consolidated into a
--                   single policy using the helper, matching the step_entries
--                   pattern (20260418110000).
--                4. No immutability trigger — every column on this table is
--                   set-once by triggers. Added trigger guarding all 8
--                   columns.
--                5. Three SECURITY DEFINER trigger functions lacked
--                   SET search_path = public: create_step_milestone_activity,
--                   create_group_join_activity, create_friendship_activity.
--                   Re-created with search_path pinned + REVOKE/GRANT.
--
--              New model:
--                - INSERT policy dropped; INSERT grant revoked. Only
--                  SECURITY DEFINER triggers can write.
--                - UPDATE/DELETE grants revoked. Table is append-only and
--                  read-only from authenticated clients.
--                - Single SELECT policy using get_friend_ids() for own +
--                  friends activity.
--                - Immutable column trigger on all columns (defense-in-depth).
--                - All three trigger functions pinned to search_path = public.
--
--              Backend and mobile are unchanged. No write path touches this
--              table directly — all inserts come from triggers.
-- Author: Claude
-- Date: 2026-04-18

-- ============================================================================
-- 1. DROP INSERT POLICY AND REVOKE INSERT GRANT
-- ============================================================================

-- All inserts come from three SECURITY DEFINER triggers:
--   create_step_milestone_activity()  (fires AFTER INSERT on step_entries)
--   create_group_join_activity()      (fires AFTER INSERT on group_memberships)
--   create_friendship_activity()      (fires AFTER INSERT OR UPDATE on friendships)
--
-- These bypass RLS entirely. The INSERT policy (auth.uid() = user_id) was pure
-- attack surface — any authenticated user could forge activity rows for
-- themselves via a direct Supabase client call.

DROP POLICY IF EXISTS "System can insert activity" ON activity_feed;
REVOKE INSERT ON activity_feed FROM authenticated;

-- ============================================================================
-- 2. REVOKE UPDATE/DELETE GRANTS (DEFENSE-IN-DEPTH)
-- ============================================================================

-- No UPDATE or DELETE policies exist, and no backend or mobile code path ever
-- updates or deletes activity rows. Explicitly revoking makes intent clear and
-- guards against any implicit grants. REVOKE is idempotent.

REVOKE UPDATE ON activity_feed FROM authenticated;
REVOKE DELETE ON activity_feed FROM authenticated;

-- ============================================================================
-- 3. CONSOLIDATE SELECT POLICIES
-- ============================================================================

-- Old setup: two policies — "Users can view own activity" (auth.uid() = user_id)
-- and "Users can view friends activity" (inline CASE/WHEN subquery on
-- friendships). The inline subquery duplicates get_friend_ids() logic.
--
-- New: single policy using the get_friend_ids() helper, matching the
-- step_entries pattern (20260418110000). The user_id = auth.uid() branch
-- short-circuits before the function call for own rows.

DROP POLICY IF EXISTS "Users can view own activity" ON activity_feed;
DROP POLICY IF EXISTS "Users can view friends activity" ON activity_feed;

CREATE POLICY "Users can view own and friends activity"
    ON activity_feed FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR user_id IN (SELECT friend_id FROM get_friend_ids(auth.uid()))
    );

-- ============================================================================
-- 4. IMMUTABLE COLUMN TRIGGER
-- ============================================================================

-- Every column on activity_feed is set-once by SECURITY DEFINER triggers.
-- There is no UPDATE grant (revoked above), but the trigger provides
-- defense-in-depth in case UPDATE access is ever re-granted for a future
-- feature.
--
-- Guarded columns (all 8):
--   id:               primary key, must never change.
--   user_id:          ownership column — changing it transfers activity to
--                     another user.
--   type:             activity type enum, set at creation.
--   message:          display text, set at creation.
--   metadata:         JSONB payload, set at creation.
--   created_at:       audit column, set-once.
--   related_user_id:  FK reference, set at creation.
--   related_group_id: FK reference, set at creation.

CREATE OR REPLACE FUNCTION activity_feed_prevent_immutable_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'activity_feed.id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'activity_feed.user_id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.type IS DISTINCT FROM OLD.type THEN
        RAISE EXCEPTION 'activity_feed.type is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN
        RAISE EXCEPTION 'activity_feed.message is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.metadata IS DISTINCT FROM OLD.metadata THEN
        RAISE EXCEPTION 'activity_feed.metadata is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'activity_feed.created_at is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.related_user_id IS DISTINCT FROM OLD.related_user_id THEN
        RAISE EXCEPTION 'activity_feed.related_user_id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.related_group_id IS DISTINCT FROM OLD.related_group_id THEN
        RAISE EXCEPTION 'activity_feed.related_group_id is immutable'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_feed_prevent_immutable_updates ON activity_feed;
CREATE TRIGGER trg_activity_feed_prevent_immutable_updates
    BEFORE UPDATE ON activity_feed
    FOR EACH ROW
    EXECUTE FUNCTION activity_feed_prevent_immutable_column_updates();

-- ============================================================================
-- 5. HARDEN SECURITY DEFINER TRIGGER FUNCTIONS
-- ============================================================================

-- All three functions were created in 20260118200000 without
-- SET search_path = public, making them vulnerable to search-path hijacking.
-- Re-create each with the search_path pinned.
--
-- These are trigger functions (invoked by the DB engine, not by users
-- directly), so REVOKE/GRANT has less practical impact than for RPC functions.
-- Added anyway for consistency with the established pattern and to prevent
-- accidental exposure if refactored into callable RPCs later.

-- 5a. create_step_milestone_activity()
-- Fires: AFTER INSERT on step_entries
-- Creates milestone activity when daily step total crosses 10K/15K/20K.

CREATE OR REPLACE FUNCTION create_step_milestone_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    daily_total INTEGER;
    user_display_name TEXT;
BEGIN
    -- Calculate daily total for the user
    SELECT COALESCE(SUM(step_count), 0) INTO daily_total
    FROM step_entries
    WHERE user_id = NEW.user_id
    AND DATE(recorded_at) = DATE(NEW.recorded_at);

    -- Get user's display name
    SELECT display_name INTO user_display_name
    FROM users WHERE id = NEW.user_id;

    -- Check for milestone achievements (10K, 15K, 20K, etc.)
    IF daily_total >= 10000 AND daily_total - NEW.step_count < 10000 THEN
        INSERT INTO activity_feed (user_id, type, message, metadata)
        VALUES (
            NEW.user_id,
            'milestone',
            user_display_name || ' hit 10,000 steps today! 🎉',
            jsonb_build_object('steps', daily_total, 'milestone', 10000)
        );
    ELSIF daily_total >= 15000 AND daily_total - NEW.step_count < 15000 THEN
        INSERT INTO activity_feed (user_id, type, message, metadata)
        VALUES (
            NEW.user_id,
            'milestone',
            user_display_name || ' hit 15,000 steps today! 🔥',
            jsonb_build_object('steps', daily_total, 'milestone', 15000)
        );
    ELSIF daily_total >= 20000 AND daily_total - NEW.step_count < 20000 THEN
        INSERT INTO activity_feed (user_id, type, message, metadata)
        VALUES (
            NEW.user_id,
            'milestone',
            user_display_name || ' hit 20,000 steps today! 💪',
            jsonb_build_object('steps', daily_total, 'milestone', 20000)
        );
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_step_milestone_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_step_milestone_activity() TO authenticated;

-- 5b. create_group_join_activity()
-- Fires: AFTER INSERT on group_memberships
-- Creates activity when a user joins a group.

CREATE OR REPLACE FUNCTION create_group_join_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_display_name TEXT;
    group_name_val TEXT;
BEGIN
    SELECT display_name INTO user_display_name
    FROM users WHERE id = NEW.user_id;

    SELECT name INTO group_name_val
    FROM groups WHERE id = NEW.group_id;

    INSERT INTO activity_feed (user_id, type, message, metadata, related_group_id)
    VALUES (
        NEW.user_id,
        'group_join',
        user_display_name || ' joined "' || group_name_val || '"',
        jsonb_build_object('group_name', group_name_val),
        NEW.group_id
    );

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_group_join_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_group_join_activity() TO authenticated;

-- 5c. create_friendship_activity()
-- Fires: AFTER INSERT OR UPDATE on friendships
-- Creates activity for both parties when a friendship is accepted.

CREATE OR REPLACE FUNCTION create_friendship_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    requester_name TEXT;
    addressee_name TEXT;
BEGIN
    IF NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted') THEN
        SELECT display_name INTO requester_name
        FROM users WHERE id = NEW.requester_id;

        SELECT display_name INTO addressee_name
        FROM users WHERE id = NEW.addressee_id;

        -- Create activity for requester
        INSERT INTO activity_feed (user_id, type, message, metadata, related_user_id)
        VALUES (
            NEW.requester_id,
            'friend_achievement',
            requester_name || ' became friends with ' || addressee_name,
            jsonb_build_object('friend_name', addressee_name),
            NEW.addressee_id
        );

        -- Create activity for addressee
        INSERT INTO activity_feed (user_id, type, message, metadata, related_user_id)
        VALUES (
            NEW.addressee_id,
            'friend_achievement',
            addressee_name || ' became friends with ' || requester_name,
            jsonb_build_object('friend_name', requester_name),
            NEW.requester_id
        );
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_friendship_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_friendship_activity() TO authenticated;

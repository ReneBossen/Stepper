-- Migration: Harden user_preferences RLS
-- Description: Closes three gaps on the user_preferences table as part of the
--              RLS hardening sweep tracked in docs/plans/rls-policies-hardening.md.
--
--              Gaps closed:
--                1. INSERT policy was unnecessary. Row creation is handled
--                   exclusively by the SECURITY DEFINER trigger
--                   create_default_user_preferences() (fires AFTER INSERT on
--                   users). The backend's EnsureUserPreferencesExistAsync uses
--                   the service role. No client path needs direct INSERT.
--                2. No BEFORE UPDATE trigger enforced immutability at the DB
--                   layer (unlike users and groups, which got one in
--                   20260413130000 / 20260413150000).
--                3. daily_step_goal had no CHECK constraint, allowing
--                   negative, zero, or absurdly large values via direct
--                   Supabase client calls.
--
--              New model:
--                - INSERT policy dropped, INSERT grant revoked from
--                  authenticated. Row creation is trigger-only.
--                - New trigger trg_user_preferences_prevent_immutable_updates
--                  rejects any change to id or created_at, mirroring the
--                  users and groups immutability triggers.
--                - CHECK constraint daily_step_goal BETWEEN 1 AND 1000000.
--
--              Backend and mobile are unchanged. No write path touches the
--              immutable columns, and the step goal range is consistent with
--              what the mobile app allows.
-- Author: Claude
-- Date: 2026-04-18

-- ============================================================================
-- PRE-CHECK (informational; run manually before applying in prod)
-- ============================================================================
--
-- Verify no existing rows violate the new CHECK constraint:
--
--   SELECT count(*) FROM user_preferences
--   WHERE daily_step_goal < 1 OR daily_step_goal > 1000000;
--
-- Must be 0. If not, fix outlier rows before applying.

-- ============================================================================
-- 1. DROP INSERT POLICY AND REVOKE INSERT GRANT
-- ============================================================================

-- Row creation is handled by create_default_user_preferences() (SECURITY
-- DEFINER trigger, fires AFTER INSERT on users). Backend's
-- EnsureUserPreferencesExistAsync uses the service role. No authenticated
-- client path needs direct INSERT.

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;

REVOKE INSERT ON user_preferences FROM authenticated;

-- ============================================================================
-- 2. IMMUTABLE COLUMN TRIGGER
-- ============================================================================

-- Mirrors users_prevent_immutable_column_updates (20260413150000) and
-- groups_prevent_immutable_column_updates (20260413130000). Rejects any
-- UPDATE that changes id or created_at. updated_at stays mutable because
-- update_user_preferences_updated_at sets it on every update.

CREATE OR REPLACE FUNCTION user_preferences_prevent_immutable_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'user_preferences.id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'user_preferences.created_at is immutable'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_preferences_prevent_immutable_updates ON user_preferences;
CREATE TRIGGER trg_user_preferences_prevent_immutable_updates
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION user_preferences_prevent_immutable_column_updates();

-- ============================================================================
-- 3. CHECK CONSTRAINT ON daily_step_goal
-- ============================================================================

-- Prevents negative, zero, or absurdly large values. The mobile app
-- constrains this in the UI, but the DB should enforce it as well.

ALTER TABLE user_preferences
    ADD CONSTRAINT chk_daily_step_goal
    CHECK (daily_step_goal BETWEEN 1 AND 1000000);

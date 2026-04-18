-- Migration: Harden step_entries RLS
-- Description: Closes gaps on the step_entries table as part of the RLS
--              hardening sweep tracked in docs/plans/rls-policies-hardening.md.
--
--              Gaps closed:
--                1. No immutability trigger — id, user_id, date, source could
--                   all be changed via UPDATE. Changing user_id is a data-theft
--                   vector; changing date/source breaks uniqueness semantics.
--                2. Friend-read SELECT policy used an inline subquery instead
--                   of the existing get_friend_ids() helper — inconsistent with
--                   established patterns and harder to maintain.
--                3. step_count had no upper-bound CHECK — the DB only enforced
--                   >= 0 while the service validates <= 200000. A client
--                   bypassing the API could insert step_count = 2147483647.
--                4. get_friend_ids(), get_daily_step_summary(), and
--                   count_step_entries_in_range() lacked SET search_path =
--                   public and had no REVOKE/GRANT — search-path hijacking
--                   risk on SECURITY DEFINER functions.
--
--              New model:
--                - Two SELECT policies consolidated into one using
--                  get_friend_ids() helper.
--                - New trigger trg_step_entries_prevent_immutable_updates
--                  rejects any change to id, user_id, date, or source.
--                - CHECK constraint step_count <= 200000.
--                - Three SECURITY DEFINER functions hardened with
--                  SET search_path = public and explicit REVOKE/GRANT.
--
--              Backend and mobile are unchanged. No write path touches the
--              immutable columns, and the step_count upper bound matches
--              StepService.MaxStepCount.
-- Author: Claude
-- Date: 2026-04-18

-- ============================================================================
-- PRE-CHECK (informational; run manually before applying in prod)
-- ============================================================================
--
-- Verify no existing rows violate the new CHECK constraint:
--
--   SELECT count(*) FROM step_entries WHERE step_count > 200000;
--
-- Must be 0. If not, fix outlier rows before applying.

-- ============================================================================
-- 1. CONSOLIDATE SELECT POLICIES
-- ============================================================================

-- Replace two separate SELECT policies (own rows + inline friend subquery)
-- with a single policy that uses the existing get_friend_ids() helper.
-- The user_id = auth.uid() branch short-circuits before the function call
-- for the user's own rows.

DROP POLICY IF EXISTS "Users can view own steps" ON step_entries;
DROP POLICY IF EXISTS "Users can view friends steps" ON step_entries;

CREATE POLICY "Users can view own and friends steps"
    ON step_entries FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR user_id IN (SELECT friend_id FROM get_friend_ids(auth.uid()))
    );

-- ============================================================================
-- 2. IMMUTABLE COLUMN TRIGGER
-- ============================================================================

-- Mirrors users_prevent_immutable_column_updates (20260413150000) and
-- user_preferences_prevent_immutable_column_updates (20260418100000).
-- Rejects any UPDATE that changes id, user_id, date, or source.
--
-- id: primary key, must never change.
-- user_id: ownership column — changing it is a data-theft vector.
-- date: part of unique constraint (user_id, date, source) — changing it
--        bypasses uniqueness semantics.
-- source: same as date — part of the unique constraint triple.
--
-- recorded_at stays mutable because the backend explicitly updates it
-- during upsert (StepRepository.UpdateExistingEntryAsync).

CREATE OR REPLACE FUNCTION step_entries_prevent_immutable_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'step_entries.id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'step_entries.user_id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.date IS DISTINCT FROM OLD.date THEN
        RAISE EXCEPTION 'step_entries.date is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.source IS DISTINCT FROM OLD.source THEN
        RAISE EXCEPTION 'step_entries.source is immutable'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_step_entries_prevent_immutable_updates ON step_entries;
CREATE TRIGGER trg_step_entries_prevent_immutable_updates
    BEFORE UPDATE ON step_entries
    FOR EACH ROW
    EXECUTE FUNCTION step_entries_prevent_immutable_column_updates();

-- ============================================================================
-- 3. CHECK CONSTRAINT ON step_count UPPER BOUND
-- ============================================================================

-- The existing anonymous CHECK (step_count >= 0) enforces the lower bound.
-- This adds the upper bound to match StepService.MaxStepCount = 200000.
-- Together they enforce 0 <= step_count <= 200000.

ALTER TABLE step_entries
    ADD CONSTRAINT chk_step_count_upper_bound
    CHECK (step_count <= 200000);

-- ============================================================================
-- 4. HARDEN SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Pin SET search_path = public on all SECURITY DEFINER functions related to
-- step_entries. Without this, a malicious user could create a same-named
-- table in their own schema and hijack the function's elevated privileges.
-- Also add explicit REVOKE/GRANT to restrict execution to authenticated
-- users only (was PUBLIC by default).

-- 4a. get_friend_ids — used by the new consolidated SELECT policy above.
-- Already had STABLE; adding search_path pin and REVOKE/GRANT.

CREATE OR REPLACE FUNCTION get_friend_ids(p_user_id UUID)
RETURNS TABLE (friend_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT CASE
        WHEN requester_id = p_user_id THEN addressee_id
        ELSE requester_id
    END as friend_id
    FROM friendships
    WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
      AND status = 'accepted';
$$;

REVOKE EXECUTE ON FUNCTION get_friend_ids(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_friend_ids(UUID) TO authenticated;

-- 4b. get_daily_step_summary — called by StepRepository.GetDailySummariesAsync.
-- Adding STABLE (was missing) and search_path pin.

CREATE OR REPLACE FUNCTION get_daily_step_summary(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    date DATE,
    total_steps BIGINT,
    total_distance_meters DOUBLE PRECISION,
    entry_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT
        se.date,
        SUM(se.step_count) as total_steps,
        COALESCE(SUM(se.distance_meters), 0) as total_distance_meters,
        COUNT(*) as entry_count
    FROM step_entries se
    WHERE se.user_id = p_user_id
      AND se.date BETWEEN p_start_date AND p_end_date
    GROUP BY se.date
    ORDER BY se.date DESC;
$$;

REVOKE EXECUTE ON FUNCTION get_daily_step_summary(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_daily_step_summary(UUID, DATE, DATE) TO authenticated;

-- 4c. count_step_entries_in_range — called by StepRepository.GetByDateRangeAsync.
-- Adding STABLE (was missing) and search_path pin.

CREATE OR REPLACE FUNCTION count_step_entries_in_range(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COUNT(*)
    FROM step_entries
    WHERE user_id = p_user_id
      AND date BETWEEN p_start_date AND p_end_date;
$$;

REVOKE EXECUTE ON FUNCTION count_step_entries_in_range(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION count_step_entries_in_range(UUID, DATE, DATE) TO authenticated;

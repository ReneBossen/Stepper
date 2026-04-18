-- Migration: Harden friendships RLS
-- Description: Closes gaps on the friendships table as part of the RLS
--              hardening sweep tracked in docs/plans/rls-policies-hardening.md.
--
--              Gaps closed:
--                1. INSERT policy allowed status = 'blocked' — a direct
--                   Supabase client could pre-block someone without a request
--                   flow. Backend only ever inserts 'pending'.
--                2. UPDATE "respond" policy had no status constraint in
--                   WITH CHECK — addressee could set status to any value
--                   (e.g. 'blocked' or back to 'pending'). Backend only sets
--                   'accepted' or 'rejected'.
--                3. "Users can block friendships" UPDATE policy was dead code
--                   with no backend endpoint. Its USING clause had no status
--                   restriction, letting either party transition from ANY
--                   status to 'blocked'. Removed entirely.
--                4. No immutability trigger — id, requester_id, addressee_id,
--                   created_at could all be changed via UPDATE.
--                5. accepted_at was set by the backend but not enforced at
--                   the DB layer — direct clients could accept without setting
--                   it, or set it to an arbitrary value.
--
--              New model:
--                - INSERT policy tightened to status = 'pending' only.
--                - UPDATE "respond" WITH CHECK constrains status to
--                  IN ('accepted', 'rejected').
--                - Blocking UPDATE policy dropped (dead code).
--                - New trigger trg_friendships_prevent_immutable_updates
--                  rejects any change to id, requester_id, addressee_id,
--                  or created_at.
--                - New trigger trg_friendships_manage_accepted_at auto-sets
--                  accepted_at = NOW() on transition to 'accepted' and NULLs
--                  it on transition away.
--
--              Backend and mobile are unchanged. No write path touches the
--              immutable columns. The accepted_at trigger overwrites the
--              backend's explicit DateTime.UtcNow with the DB server's NOW(),
--              which is more accurate (eliminates clock-skew risk).
--
--              The 'blocked' value stays in the status CHECK constraint for
--              forward-compatibility. After this migration, no RLS-guarded
--              path can write it — only the service role can.
-- Author: Claude
-- Date: 2026-04-18

-- ============================================================================
-- PRE-CHECK (informational; run manually before applying in prod)
-- ============================================================================
--
-- Verify no existing rows have status = 'blocked' (blocking policy is being
-- removed; any blocked rows would be orphaned from normal write paths):
--
--   SELECT count(*) FROM friendships WHERE status = 'blocked';
--
-- Must be 0. If not, decide whether to delete those rows or change their
-- status before applying.

-- ============================================================================
-- 1. TIGHTEN INSERT POLICY
-- ============================================================================

-- Old policy (from docs/migrations/005) allowed status = 'pending' OR
-- status = 'blocked'. The backend only ever inserts 'pending'. Remove the
-- 'blocked' branch so a direct Supabase client cannot pre-block someone.

DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;

CREATE POLICY "Users can send friend requests"
    ON friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id AND status = 'pending');

-- ============================================================================
-- 2. TIGHTEN UPDATE "RESPOND" POLICY
-- ============================================================================

-- Old USING was correct (addressee only, pending rows only), but WITH CHECK
-- only verified uid() = addressee_id with no status constraint. The addressee
-- could set status to anything ('blocked', back to 'pending', etc.). Now
-- constrains to the two valid responses: 'accepted' or 'rejected'.

DROP POLICY IF EXISTS "Addressee can respond to requests" ON friendships;

CREATE POLICY "Addressee can respond to requests"
    ON friendships FOR UPDATE
    USING (auth.uid() = addressee_id AND status = 'pending')
    WITH CHECK (auth.uid() = addressee_id AND status IN ('accepted', 'rejected'));

-- ============================================================================
-- 3. DROP BLOCKING UPDATE POLICY (DEAD CODE)
-- ============================================================================

-- The backend has no block/unblock endpoint. This policy let either party
-- transition from ANY status to 'blocked' via direct Supabase client — pure
-- attack surface with no legitimate use. If blocking is implemented later,
-- it should go through a SECURITY DEFINER RPC with proper scoping.

DROP POLICY IF EXISTS "Users can block friendships" ON friendships;

-- ============================================================================
-- 4. IMMUTABLE COLUMN TRIGGER
-- ============================================================================

-- Mirrors users_prevent_immutable_column_updates (20260413150000),
-- user_preferences_prevent_immutable_column_updates (20260418100000), and
-- step_entries_prevent_immutable_column_updates (20260418110000).
--
-- Guarded columns:
--   id:           primary key, must never change.
--   requester_id: ownership column — changing it forges a request from
--                 someone else. Part of UNIQUE(requester_id, addressee_id).
--   addressee_id: the other ownership column — changing it redirects a
--                 request to a different user. Part of the unique constraint.
--   created_at:   audit column, set-once.

CREATE OR REPLACE FUNCTION friendships_prevent_immutable_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'friendships.id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.requester_id IS DISTINCT FROM OLD.requester_id THEN
        RAISE EXCEPTION 'friendships.requester_id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.addressee_id IS DISTINCT FROM OLD.addressee_id THEN
        RAISE EXCEPTION 'friendships.addressee_id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'friendships.created_at is immutable'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friendships_prevent_immutable_updates ON friendships;
CREATE TRIGGER trg_friendships_prevent_immutable_updates
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION friendships_prevent_immutable_column_updates();

-- ============================================================================
-- 5. AUTO-SET accepted_at VIA TRIGGER
-- ============================================================================

-- The backend sets accepted_at = DateTime.UtcNow when accepting, but the DB
-- didn't enforce this. A direct client could accept without setting it.
--
-- This trigger auto-manages accepted_at:
--   - Transition INTO 'accepted' → set accepted_at = NOW()
--   - Transition OUT OF 'accepted' → set accepted_at = NULL
--   - Otherwise → leave unchanged
--
-- The backend's explicit AcceptedAt assignment is harmlessly overwritten by
-- the trigger's NOW() — same result, more accurate (DB server clock).
--
-- Trigger ordering: PostgreSQL fires BEFORE UPDATE triggers alphabetically.
--   trg_friendships_manage_accepted_at  (this one — fires first)
--   trg_friendships_prevent_immutable_updates (fires second)
-- This is correct: accepted_at is NOT in the immutable list, so the
-- immutability trigger won't reject the change made here.

CREATE OR REPLACE FUNCTION friendships_manage_accepted_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
        NEW.accepted_at := NOW();
    ELSIF OLD.status = 'accepted' AND NEW.status IS DISTINCT FROM 'accepted' THEN
        NEW.accepted_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friendships_manage_accepted_at ON friendships;
CREATE TRIGGER trg_friendships_manage_accepted_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION friendships_manage_accepted_at();

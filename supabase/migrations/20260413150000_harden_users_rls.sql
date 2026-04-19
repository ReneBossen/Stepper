-- Migration: Harden users RLS
-- Description: Closes three gaps on the users table as part of the RLS
--              hardening sweep tracked in docs/plans/rls-policies-hardening.md.
--
--              Gaps closed:
--                1. Discovery was opt-out. The "Anyone can discover users" policy
--                   treated a missing user_preferences row as public, and the
--                   column default for privacy_find_me was 'public', so every
--                   new signup was enumerable by any authenticated user.
--                2. The UPDATE policy had no column restriction, letting a user
--                   rewrite immutable fields (id, qr_code_id, created_at) on
--                   their own row. qr_code_id is the friend-discovery token and
--                   must be set-once.
--                3. No BEFORE UPDATE trigger enforced immutability at the DB
--                   layer (unlike groups, which got one in 20260413130000).
--
--              New model:
--                - privacy_find_me column default flips to 'private'. Existing
--                  rows are not migrated (explicit product decision: only new
--                  signups go private; current users keep their setting).
--                - Discovery SELECT policy requires an explicit user_preferences
--                  row with privacy_find_me IN ('public', 'partial'). Own-row
--                  access (policy "Users can view own profile") and friend
--                  access (policy "Users can view friends profiles") are
--                  unchanged and still allow a private user to be seen by
--                  themselves and by accepted friends.
--                - search_users RPC loses the "up.id IS NULL => discoverable"
--                  branch so its behavior matches the tightened policy.
--                - New trigger trg_users_prevent_immutable_updates rejects any
--                  change to id, qr_code_id, or created_at, mirroring the
--                  groups_prevent_immutable_column_updates pattern.
--
--              Backend and mobile are unchanged. UserRepository.UpdateAsync
--              only touches display_name, avatar_url, onboarding_completed, so
--              the new trigger never fires on legitimate traffic.
-- Author: Claude
-- Date: 2026-04-13

-- ============================================================================
-- PRE-CHECK (informational; run manually before applying in prod)
-- ============================================================================
--
-- Every user must already have a user_preferences row; otherwise they will
-- disappear from discovery after this migration. The on_user_created_create_preferences
-- trigger and EnsureProfileExistsAsync both guarantee this for current code
-- paths, but verify in prod before applying:
--
--   SELECT count(*) FROM users u
--   LEFT JOIN user_preferences up ON up.id = u.id
--   WHERE up.id IS NULL;
--
-- Must be 0. If not, backfill with:
--
--   INSERT INTO user_preferences (id)
--   SELECT u.id FROM users u
--   LEFT JOIN user_preferences up ON up.id = u.id
--   WHERE up.id IS NULL;

-- ============================================================================
-- 1. FLIP user_preferences.privacy_find_me DEFAULT TO 'private'
-- ============================================================================

-- create_default_user_preferences() inserts only (id), so it inherits whatever
-- the column default is. No function rewrite needed.
ALTER TABLE user_preferences
    ALTER COLUMN privacy_find_me SET DEFAULT 'private';

COMMENT ON COLUMN user_preferences.privacy_find_me IS
    'Who can discover this user via search: public, partial (friends of '
    'friends), or private. Default is ''private'' for new rows (opt-in '
    'discovery). Existing rows retain whatever value was set at creation time.';

-- ============================================================================
-- 2. REPLACE DISCOVERY SELECT POLICY ON users
-- ============================================================================

-- Old policy: NOT EXISTS(up WHERE up.privacy_find_me = 'private') — treats a
-- missing prefs row as discoverable.
-- New policy: EXISTS(up WHERE up.privacy_find_me IN ('public','partial')) —
-- requires an explicit opt-in. A user with no prefs row is not discoverable
-- by strangers; they are still visible to themselves (policy "Users can view
-- own profile") and to accepted friends (policy "Users can view friends
-- profiles" from docs/migrations/004).

DROP POLICY IF EXISTS "Anyone can discover users" ON users;

CREATE POLICY "Discoverable users are findable"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_preferences up
            WHERE up.id = users.id
              AND up.privacy_find_me IN ('public', 'partial')
        )
    );

COMMENT ON POLICY "Discoverable users are findable" ON users IS
    'Allows authenticated users to see profiles of users who have explicitly '
    'opted into discovery via privacy_find_me = ''public'' or ''partial''. '
    'OR''d with "Users can view own profile" and "Users can view friends '
    'profiles" so a private user remains visible to themselves and to '
    'accepted friends.';

-- The partial index idx_user_preferences_privacy_private created by
-- 20260124120000 is no longer useful (we query for 'public'/'partial', not
-- 'private'). The existing idx_user_preferences_privacy_find_me_public and
-- idx_user_preferences_privacy_find_me_partial from 20260119150000 cover the
-- new policy's lookup pattern.
DROP INDEX IF EXISTS idx_user_preferences_privacy_private;

-- ============================================================================
-- 3. TIGHTEN search_users RPC TO MATCH
-- ============================================================================

-- Drops the `up.id IS NULL` branch so users without a prefs row are no longer
-- treated as discoverable. Signature and return shape are preserved, so the
-- existing .NET caller in Stepper.Api/Friends/Discovery/ needs no change.

CREATE OR REPLACE FUNCTION search_users(
    search_query TEXT,
    requesting_user_id UUID
)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    avatar_url TEXT,
    friendship_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF requesting_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: requesting_user_id must match authenticated user'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.display_name,
        u.avatar_url,
        COALESCE(
            (SELECT f.status::TEXT
             FROM friendships f
             WHERE (f.requester_id = requesting_user_id AND f.addressee_id = u.id)
                OR (f.addressee_id = requesting_user_id AND f.requester_id = u.id)
             LIMIT 1),
            'none'
        ) AS friendship_status
    FROM users u
    INNER JOIN user_preferences up ON up.id = u.id
    WHERE u.id != requesting_user_id
      AND (
          LOWER(u.display_name) LIKE LOWER('%' || search_query || '%')
          OR u.display_name % search_query
      )
      AND (
          up.privacy_find_me = 'public'
          OR (
              up.privacy_find_me = 'partial'
              AND EXISTS (
                  SELECT 1 FROM friendships f1
                  INNER JOIN friendships f2
                      ON (f2.requester_id = CASE WHEN f1.requester_id = requesting_user_id THEN f1.addressee_id ELSE f1.requester_id END
                          OR f2.addressee_id = CASE WHEN f1.requester_id = requesting_user_id THEN f1.addressee_id ELSE f1.requester_id END)
                  WHERE (f1.requester_id = requesting_user_id OR f1.addressee_id = requesting_user_id)
                    AND f1.status = 'accepted'
                    AND f2.status = 'accepted'
                    AND (f2.requester_id = u.id OR f2.addressee_id = u.id)
                    AND f2.requester_id != requesting_user_id
                    AND f2.addressee_id != requesting_user_id
              )
          )
      )
    ORDER BY
        similarity(u.display_name, search_query) DESC,
        u.display_name
    LIMIT 50;
END;
$$;

COMMENT ON FUNCTION search_users(TEXT, UUID) IS
    'Searches users by display_name and returns friendship status per result. '
    'SECURITY DEFINER so it bypasses the users SELECT policy while still '
    'honoring user_preferences.privacy_find_me. Only returns users with '
    'privacy_find_me IN (''public'',''partial''); users without a prefs row '
    'are not returned.';

REVOKE EXECUTE ON FUNCTION search_users(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_users(TEXT, UUID) TO authenticated;

-- ============================================================================
-- 4. IMMUTABLE COLUMN TRIGGER ON users
-- ============================================================================

-- Mirrors groups_prevent_immutable_column_updates from 20260413130000. Rejects
-- any UPDATE that changes id, qr_code_id, or created_at. updated_at stays
-- mutable because update_users_updated_at (docs/migrations/002) sets it on
-- every update. Trigger ordering is irrelevant: this trigger compares NEW vs
-- OLD on fields that update_users_updated_at does not touch.

CREATE OR REPLACE FUNCTION users_prevent_immutable_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'users.id is immutable' USING ERRCODE = '42501';
    END IF;
    IF NEW.qr_code_id IS DISTINCT FROM OLD.qr_code_id THEN
        RAISE EXCEPTION 'users.qr_code_id is immutable' USING ERRCODE = '42501';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'users.created_at is immutable' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_prevent_immutable_updates ON users;
CREATE TRIGGER trg_users_prevent_immutable_updates
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION users_prevent_immutable_column_updates();

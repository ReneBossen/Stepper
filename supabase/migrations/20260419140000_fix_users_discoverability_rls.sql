-- Migration: Fix users "Discoverable users are findable" RLS policy
-- Description: The policy added in 20260413150000_harden_users_rls.sql checks
--              EXISTS (SELECT 1 FROM user_preferences ...) inline. That
--              subquery runs under the caller's role and is therefore subject
--              to user_preferences RLS, which only exposes the caller's own
--              row (auth.uid() = id). As a result, the EXISTS always returned
--              false for non-self users and the policy never matched, so
--              authenticated reads via the regular client (e.g.
--              UserRepository.GetByIdAsync used by SendFriendRequestAsync)
--              returned 404 even for users with privacy_find_me = 'public'.
--              search_users worked because it is SECURITY DEFINER and bypasses
--              RLS on both tables.
--
--              Fix: introduce is_user_discoverable(target_user_id) as
--              SECURITY DEFINER so the prefs lookup bypasses RLS, then
--              rewrite the policy to call it. Behavior matches the original
--              intent of 20260413150000.
-- Author: Claude
-- Date: 2026-04-19

-- ============================================================================
-- 1. Helper function (SECURITY DEFINER) that bypasses user_preferences RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_user_discoverable(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_preferences
        WHERE id = target_user_id
          AND privacy_find_me IN ('public', 'partial')
    );
$$;

COMMENT ON FUNCTION public.is_user_discoverable(UUID) IS
    'Returns true when the given user has opted into discovery via '
    'privacy_find_me IN (''public'',''partial''). SECURITY DEFINER so callers '
    'can check discoverability of users other than themselves without being '
    'blocked by user_preferences RLS.';

REVOKE EXECUTE ON FUNCTION public.is_user_discoverable(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_discoverable(UUID) TO authenticated;

-- ============================================================================
-- 2. Replace the broken policy with one that uses the helper
-- ============================================================================

DROP POLICY IF EXISTS "Discoverable users are findable" ON users;

CREATE POLICY "Discoverable users are findable"
    ON users FOR SELECT
    USING (is_user_discoverable(id));

COMMENT ON POLICY "Discoverable users are findable" ON users IS
    'Allows authenticated users to see profiles of users who have explicitly '
    'opted into discovery via privacy_find_me IN (''public'',''partial''). '
    'Delegates to is_user_discoverable() (SECURITY DEFINER) so the '
    'user_preferences lookup is not blocked by that table''s own RLS. OR''d '
    'with "Users can view own profile" and "Users can view friends profiles" '
    'so a private user remains visible to themselves and to accepted friends.';

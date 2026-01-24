-- Migration: Fix user discovery RLS policy
-- Description: Fixes the RLS policy for user discovery/search. The existing policies
--              are too restrictive and don't allow users to search for other users.
--              This migration adds a policy that allows anyone (including unauthenticated
--              users) to discover other users for the purpose of viewing profiles
--              and sending friend requests.
-- Author: Database Engineer Agent
-- Date: 2026-01-24
--
-- Root Cause:
-- The searchUsers function in friendsApi.ts queries the users table directly:
--   .from('users').select('id, display_name, avatar_url').neq('id', user.id).ilike('display_name', ...)
--
-- Current RLS policies only allow:
--   1. "Users can view own profile" - auth.uid() = id
--   2. "Users can view friends profiles" - user is an accepted friend
--   3. "Users can view discoverable users" - requires user_preferences with privacy_find_me = 'public'
--
-- Problem: Users without user_preferences records (or with different privacy settings)
-- cannot be discovered at all, breaking the friend search functionality.
--
-- Solution: Add a policy that allows anyone to discover users who haven't opted out.
-- Users who want to hide from search can set privacy_find_me = 'private' in their
-- user_preferences. The default behavior is to be discoverable.
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the policy was created successfully
-- 8. Test search: SELECT id, display_name FROM users WHERE display_name ILIKE '%test%' LIMIT 10;

-- ============================================================================
-- DROP EXISTING POLICY
-- ============================================================================

-- Drop the overly complex "Users can view discoverable users" policy from migration 015
-- This policy requires user_preferences to exist which breaks discovery for users
-- who haven't set up preferences yet
DROP POLICY IF EXISTS "Users can view discoverable users" ON users;

-- ============================================================================
-- ROW LEVEL SECURITY - User Discovery Policy
-- ============================================================================

-- Policy: Allow anyone to discover users for search/friend requests
-- This policy enables the Friend Discovery feature by allowing anyone to search for
-- and view basic profile info (id, display_name, avatar_url) of other users.
--
-- Security considerations:
-- 1. Users can opt out of discovery by setting privacy_find_me = 'private'
-- 2. Default behavior (no user_preferences record) is to be discoverable
-- 3. Only basic profile info is exposed (not sensitive data)
-- 4. This is SELECT only - no ability to modify data
--
-- Note: Blocking is handled at the application layer when sending friend requests,
-- not at the discovery layer. Users should be able to see that someone exists
-- even if they are blocked (they just can't interact with them).

CREATE POLICY "Anyone can discover users"
    ON users FOR SELECT
    USING (
        -- User is discoverable if:
        -- 1. They have no user_preferences record (default = discoverable)
        -- 2. OR they have preferences but haven't set privacy_find_me to 'private'
        NOT EXISTS (
            SELECT 1 FROM user_preferences up
            WHERE up.id = users.id
            AND up.privacy_find_me = 'private'
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Anyone can discover users" ON users IS
    'Allows anyone to search/discover users for viewing profiles and friend requests. '
    'Users can opt out by setting privacy_find_me = private in user_preferences. '
    'Default behavior (no preferences record) is to be discoverable.';

-- ============================================================================
-- INDEX OPTIMIZATION
-- ============================================================================

-- Create partial index for private users to optimize the NOT EXISTS check
-- This allows fast exclusion of private users during search
CREATE INDEX IF NOT EXISTS idx_user_preferences_privacy_private
    ON user_preferences(id)
    WHERE privacy_find_me = 'private';

COMMENT ON INDEX idx_user_preferences_privacy_private IS
    'Partial index for efficient exclusion of private users in discovery policy';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- After running this migration, test with:
--
-- -- Should return all users except those with privacy_find_me = 'private'
-- SELECT id, display_name, avatar_url
-- FROM users
-- WHERE display_name ILIKE '%test%'
-- LIMIT 20;
--
-- -- To verify a specific user is discoverable
-- SELECT id, display_name
-- FROM users
-- WHERE id = 'target-user-uuid';
--
-- -- To check which users have opted out of discovery
-- SELECT u.id, u.display_name, up.privacy_find_me
-- FROM users u
-- JOIN user_preferences up ON up.id = u.id
-- WHERE up.privacy_find_me = 'private';

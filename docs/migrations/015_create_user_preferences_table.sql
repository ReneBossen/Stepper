-- Migration: Create user_preferences table
-- Description: Creates a dedicated table for user preferences, replacing the JSONB preferences
--              column on the users table. Enables better querying and RLS policies for
--              privacy settings, particularly for Friend Discovery feature.
-- Author: Database Engineer Agent
-- Date: 2026-01-19
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the table, policies, and triggers were created successfully
-- 8. Test with: SELECT * FROM user_preferences LIMIT 1;

-- ============================================================================
-- TABLE: user_preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    -- Primary key is same as user id, 1:1 relationship with auth.users
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Step tracking preferences
    daily_step_goal INTEGER DEFAULT 10000,

    -- Display preferences
    units TEXT DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),

    -- Notification preferences
    notifications_enabled BOOLEAN DEFAULT true,

    -- Privacy preferences for Friend Discovery
    -- 'public' = anyone can find this user via search
    -- 'partial' = only friends of friends can find this user
    -- 'private' = user is not discoverable via search
    privacy_find_me TEXT DEFAULT 'public' CHECK (privacy_find_me IN ('public', 'partial', 'private')),

    -- Privacy preferences for step visibility
    -- 'public' = anyone can view steps (if they can find the user)
    -- 'partial' = only friends can view steps
    -- 'private' = steps are completely private
    privacy_show_steps TEXT DEFAULT 'partial' CHECK (privacy_show_steps IN ('public', 'partial', 'private')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying discoverable users (Friend Discovery search)
-- This partial index only includes users who have opted in to be discoverable
CREATE INDEX idx_user_preferences_privacy_find_me_public
    ON user_preferences(id)
    WHERE privacy_find_me = 'public';

-- Index for partial (friends_of_friends) privacy lookups
CREATE INDEX idx_user_preferences_privacy_find_me_partial
    ON user_preferences(id)
    WHERE privacy_find_me = 'partial';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- USERS TABLE: Add policy for discoverable users search
-- ============================================================================

-- Policy: Allow searching for users who have opted in to be discoverable
-- This policy allows SELECT on users table when the target user has privacy_find_me = 'public'
-- Used by Friend Discovery to find users via search
CREATE POLICY "Users can view discoverable users"
    ON users FOR SELECT
    USING (
        -- Always allow viewing own profile
        id = auth.uid()
        -- Allow viewing users who are publicly discoverable
        OR EXISTS (
            SELECT 1 FROM user_preferences up
            WHERE up.id = users.id
            AND up.privacy_find_me = 'public'
        )
        -- Allow viewing partial (friends_of_friends) if user is a friend of a friend
        OR EXISTS (
            SELECT 1 FROM user_preferences up
            WHERE up.id = users.id
            AND up.privacy_find_me = 'partial'
            AND EXISTS (
                -- Check if target user shares a mutual friend with current user
                SELECT 1 FROM friendships f1
                INNER JOIN friendships f2
                    ON (f2.requester_id = CASE WHEN f1.requester_id = auth.uid() THEN f1.addressee_id ELSE f1.requester_id END
                        OR f2.addressee_id = CASE WHEN f1.requester_id = auth.uid() THEN f1.addressee_id ELSE f1.requester_id END)
                WHERE (f1.requester_id = auth.uid() OR f1.addressee_id = auth.uid())
                AND f1.status = 'accepted'
                AND f2.status = 'accepted'
                AND (f2.requester_id = users.id OR f2.addressee_id = users.id)
                AND f2.requester_id != auth.uid()
                AND f2.addressee_id != auth.uid()
            )
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at timestamp on changes
-- Note: update_updated_at_column() function already exists from migration 002
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Auto-create preferences when user is created
-- ============================================================================

-- Function to automatically create user_preferences row when a new user is created
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Trigger: Create default preferences when user profile is created
CREATE TRIGGER on_user_created_create_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_preferences();

-- ============================================================================
-- FUNCTION: Updated search_users to respect privacy settings
-- ============================================================================

-- Update the search_users function to filter by privacy_find_me setting
CREATE OR REPLACE FUNCTION search_users(
    search_query TEXT,
    requesting_user_id UUID
)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    avatar_url TEXT,
    friendship_status TEXT
) AS $$
BEGIN
    -- Authorization check: verify requesting_user_id matches authenticated user
    IF requesting_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: requesting_user_id must match authenticated user';
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
    -- Join with preferences to check privacy settings
    LEFT JOIN user_preferences up ON up.id = u.id
    WHERE u.id != requesting_user_id
      AND (
          LOWER(u.display_name) LIKE LOWER('%' || search_query || '%')
          OR u.display_name % search_query  -- Trigram similarity
      )
      -- Only include users who are discoverable
      AND (
          -- User has explicitly set privacy to 'public'
          up.privacy_find_me = 'public'
          -- OR user has no preferences yet (default behavior is discoverable)
          OR up.id IS NULL
          -- OR user allows partial (friends_of_friends) and requesting user is a friend of friend
          OR (
              up.privacy_find_me = 'partial'
              AND EXISTS (
                  -- Check if target user shares a mutual friend with requesting user
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_preferences IS 'User preferences and privacy settings, 1:1 with auth.users';
COMMENT ON COLUMN user_preferences.id IS 'User ID from auth.users (primary key)';
COMMENT ON COLUMN user_preferences.daily_step_goal IS 'Daily step goal target (default 10000)';
COMMENT ON COLUMN user_preferences.units IS 'Measurement units: metric or imperial';
COMMENT ON COLUMN user_preferences.notifications_enabled IS 'Whether push notifications are enabled';
COMMENT ON COLUMN user_preferences.privacy_find_me IS 'Who can discover this user via search: public, partial (friends of friends), or private';
COMMENT ON COLUMN user_preferences.privacy_show_steps IS 'Who can view this user step data: public, partial (friends only), or private';
COMMENT ON COLUMN user_preferences.created_at IS 'Timestamp when preferences were created';
COMMENT ON COLUMN user_preferences.updated_at IS 'Timestamp when preferences were last updated';

-- ============================================================================
-- DATA MIGRATION: Migrate existing JSONB preferences to new table
-- ============================================================================

-- Insert preferences for existing users, extracting values from JSONB if they exist
-- This handles backward compatibility with the old preferences column
INSERT INTO user_preferences (id, daily_step_goal, units, notifications_enabled)
SELECT
    u.id,
    COALESCE((u.preferences->>'daily_step_goal')::INTEGER, 10000),
    COALESCE(u.preferences->>'units', 'metric'),
    COALESCE((u.preferences->>'notifications_enabled')::BOOLEAN, true)
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up WHERE up.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CLEANUP NOTE
-- ============================================================================

-- The preferences JSONB column on the users table can be deprecated in a future migration
-- once the application code has been updated to use the new user_preferences table.
-- DO NOT drop the column in this migration to allow for gradual rollout.

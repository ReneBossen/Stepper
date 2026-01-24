-- Migration: Add Notification Preference Columns
-- Description: Adds granular notification preference columns to the user_preferences table
--              to enable fine-grained control over different types of notifications.
-- Author: Database Engineer Agent
-- Date: 2026-01-24
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the columns were added successfully using the verification queries below

-- ============================================================================
-- BACKGROUND
-- ============================================================================
-- The user_preferences table currently has a single 'notifications_enabled' boolean
-- which is too coarse-grained. This migration adds specific notification preferences
-- for different categories:
--
--   Friend Activity:
--     - notify_friend_requests: New friend request received
--     - notify_friend_accepted: Friend request accepted
--     - notify_friend_milestones: Friends achieve milestones
--
--   Groups:
--     - notify_group_invites: Invited to join a group
--     - notify_leaderboard_updates: Leaderboard position changes
--     - notify_competition_reminders: Competition start/end reminders
--
--   Personal:
--     - notify_goal_achieved: Daily step goal reached
--     - notify_streak_reminders: Reminders to maintain streak
--     - notify_weekly_summary: Weekly activity summary
--
--   Privacy:
--     - privacy_profile_visibility: Overall profile visibility setting
--
-- Current user_preferences columns (before this migration):
--   - id, daily_step_goal, units, notifications_enabled,
--     privacy_find_me, privacy_show_steps, created_at, updated_at

-- ============================================================================
-- COLUMNS: Friend Activity Notifications
-- ============================================================================

-- Notification when receiving a new friend request
ALTER TABLE user_preferences
ADD COLUMN notify_friend_requests BOOLEAN DEFAULT true;

-- Notification when a friend request is accepted
ALTER TABLE user_preferences
ADD COLUMN notify_friend_accepted BOOLEAN DEFAULT true;

-- Notification when friends achieve milestones (personal bests, streaks, etc.)
ALTER TABLE user_preferences
ADD COLUMN notify_friend_milestones BOOLEAN DEFAULT true;

-- ============================================================================
-- COLUMNS: Group Notifications
-- ============================================================================

-- Notification when invited to join a group
ALTER TABLE user_preferences
ADD COLUMN notify_group_invites BOOLEAN DEFAULT true;

-- Notification when leaderboard position changes (can be noisy, default off)
ALTER TABLE user_preferences
ADD COLUMN notify_leaderboard_updates BOOLEAN DEFAULT false;

-- Notification for competition start/end reminders
ALTER TABLE user_preferences
ADD COLUMN notify_competition_reminders BOOLEAN DEFAULT true;

-- ============================================================================
-- COLUMNS: Personal Notifications
-- ============================================================================

-- Notification when daily step goal is achieved
ALTER TABLE user_preferences
ADD COLUMN notify_goal_achieved BOOLEAN DEFAULT true;

-- Notification reminding to maintain step streak
ALTER TABLE user_preferences
ADD COLUMN notify_streak_reminders BOOLEAN DEFAULT true;

-- Weekly activity summary notification
ALTER TABLE user_preferences
ADD COLUMN notify_weekly_summary BOOLEAN DEFAULT true;

-- ============================================================================
-- COLUMNS: Privacy Settings
-- ============================================================================

-- Overall profile visibility setting
-- 'public' = Full profile visible to everyone
-- 'partial' = Limited profile info visible (name, avatar only)
-- 'private' = Profile only visible to friends
ALTER TABLE user_preferences
ADD COLUMN privacy_profile_visibility TEXT DEFAULT 'public'
CHECK (privacy_profile_visibility IN ('public', 'partial', 'private'));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN user_preferences.notify_friend_requests IS 'Enable notifications for new friend requests';
COMMENT ON COLUMN user_preferences.notify_friend_accepted IS 'Enable notifications when friend requests are accepted';
COMMENT ON COLUMN user_preferences.notify_friend_milestones IS 'Enable notifications when friends achieve milestones';
COMMENT ON COLUMN user_preferences.notify_group_invites IS 'Enable notifications for group invitations';
COMMENT ON COLUMN user_preferences.notify_leaderboard_updates IS 'Enable notifications for leaderboard position changes';
COMMENT ON COLUMN user_preferences.notify_competition_reminders IS 'Enable notifications for competition start/end reminders';
COMMENT ON COLUMN user_preferences.notify_goal_achieved IS 'Enable notifications when daily step goal is achieved';
COMMENT ON COLUMN user_preferences.notify_streak_reminders IS 'Enable notifications to maintain step streak';
COMMENT ON COLUMN user_preferences.notify_weekly_summary IS 'Enable weekly activity summary notifications';
COMMENT ON COLUMN user_preferences.privacy_profile_visibility IS 'Overall profile visibility: public (all), partial (limited), private (friends only)';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- No new RLS policies needed - existing policies on user_preferences cover
-- the new columns:
--   - "Users can view own preferences" - allows viewing notification settings
--   - "Users can insert own preferences" - allows setting initial values
--   - "Users can update own preferences" - allows changing notification settings

-- ============================================================================
-- INDEXES
-- ============================================================================
-- No indexes needed for these boolean columns as they:
--   1. Have low cardinality (only true/false values)
--   2. Are not used in WHERE clauses for queries
--   3. Are only fetched alongside other user preferences

-- ============================================================================
-- DEPRECATION NOTE
-- ============================================================================
-- The existing 'notifications_enabled' column is retained for backward
-- compatibility. It can serve as a master toggle that overrides all
-- individual notification settings. Application code should be updated to:
--   1. Check notifications_enabled first (master toggle)
--   2. If enabled, check individual notification type settings
--
-- Example application logic:
--   canSendNotification = notifications_enabled AND notify_friend_requests
--
-- In a future migration, consider either:
--   a) Removing notifications_enabled if no longer needed, or
--   b) Renaming it to notify_master_toggle for clarity

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After running this migration, verify with these queries:

-- 1. Check all notification columns were added:
/*
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_preferences'
  AND column_name LIKE 'notify_%'
ORDER BY column_name;
*/

-- Expected output (10 rows):
-- | column_name                  | data_type | column_default | is_nullable |
-- |------------------------------|-----------|----------------|-------------|
-- | notify_competition_reminders | boolean   | true           | YES         |
-- | notify_friend_accepted       | boolean   | true           | YES         |
-- | notify_friend_milestones     | boolean   | true           | YES         |
-- | notify_friend_requests       | boolean   | true           | YES         |
-- | notify_goal_achieved         | boolean   | true           | YES         |
-- | notify_group_invites         | boolean   | true           | YES         |
-- | notify_leaderboard_updates   | boolean   | false          | YES         |
-- | notify_streak_reminders      | boolean   | true           | YES         |
-- | notify_weekly_summary        | boolean   | true           | YES         |

-- 2. Check privacy_profile_visibility column was added:
/*
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_preferences'
  AND column_name = 'privacy_profile_visibility';
*/

-- Expected output:
-- | column_name                | data_type | column_default | is_nullable |
-- |----------------------------|-----------|----------------|-------------|
-- | privacy_profile_visibility | text      | 'public'::text | YES         |

-- 3. Check constraint was created for privacy_profile_visibility:
/*
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%privacy_profile_visibility%';
*/

-- 4. Verify existing rows have default values:
/*
SELECT
    id,
    notify_friend_requests,
    notify_friend_accepted,
    notify_friend_milestones,
    notify_group_invites,
    notify_leaderboard_updates,
    notify_competition_reminders,
    notify_goal_achieved,
    notify_streak_reminders,
    notify_weekly_summary,
    privacy_profile_visibility
FROM user_preferences
LIMIT 5;
*/

-- 5. Test constraint enforcement (this should fail):
/*
UPDATE user_preferences
SET privacy_profile_visibility = 'invalid_value'
WHERE id = (SELECT id FROM user_preferences LIMIT 1);
*/
-- Expected: ERROR: new row for relation "user_preferences" violates check constraint

-- 6. Full schema verification:
/*
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;
*/

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback this migration, run:
/*
ALTER TABLE user_preferences DROP COLUMN IF EXISTS notify_friend_requests;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS notify_friend_accepted;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS notify_friend_milestones;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS notify_group_invites;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS notify_leaderboard_updates;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS notify_competition_reminders;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS notify_goal_achieved;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS notify_streak_reminders;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS notify_weekly_summary;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS privacy_profile_visibility;
*/

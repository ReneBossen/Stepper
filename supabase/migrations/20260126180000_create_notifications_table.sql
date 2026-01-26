-- Migration: Create notifications table
-- Description: Creates the notifications table for storing user notifications (friend requests,
--              friend accepted, group invites, goal achievements, and general notifications).
--              Includes RLS policies to ensure users can only access their own notifications.
-- Author: Database Engineer Agent
-- Date: 2026-01-26
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the table, policies, and triggers were created successfully
-- 8. Test with: SELECT * FROM notifications LIMIT 1;

-- ============================================================================
-- TABLE: notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner of the notification
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Notification type with constrained values
    type TEXT NOT NULL CHECK (type IN ('general', 'friend_request', 'friend_accepted', 'group_invite', 'goal_achieved')),

    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Read status
    is_read BOOLEAN NOT NULL DEFAULT false,

    -- Additional metadata (sender_id, group_id, etc.)
    data JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fast user lookups (most common query pattern)
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Composite index for unread count queries
-- Supports queries like: SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false
CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read);

-- Composite index for timeline queries (user's notifications ordered by date)
-- Supports queries like: SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only update their own notifications (for marking as read)
CREATE POLICY "Users can update own notifications"
    ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Only service role can insert notifications
-- Notifications are created by the backend (service role), not directly by users.
-- This prevents users from creating fake notifications for themselves or others.
CREATE POLICY "Service role can insert notifications"
    ON notifications
    FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at timestamp on changes
-- Note: update_updated_at_column() function already exists from migration 002
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant SELECT, UPDATE, DELETE to authenticated users (INSERT is handled via service role)
GRANT SELECT, UPDATE, DELETE ON notifications TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notifications IS 'User notifications for friend requests, group invites, achievements, etc.';
COMMENT ON COLUMN notifications.id IS 'Unique notification identifier (UUID)';
COMMENT ON COLUMN notifications.user_id IS 'User who receives this notification (references auth.users)';
COMMENT ON COLUMN notifications.type IS 'Notification type: general, friend_request, friend_accepted, group_invite, goal_achieved';
COMMENT ON COLUMN notifications.title IS 'Short notification title';
COMMENT ON COLUMN notifications.message IS 'Full notification message';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read by the user';
COMMENT ON COLUMN notifications.data IS 'Additional metadata as JSONB (sender_id, group_id, achievement details, etc.)';
COMMENT ON COLUMN notifications.created_at IS 'Timestamp when notification was created';
COMMENT ON COLUMN notifications.updated_at IS 'Timestamp when notification was last updated';

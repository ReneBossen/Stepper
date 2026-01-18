-- ============================================================================
-- Complete Walking App Database Setup
-- ============================================================================
-- Description: Complete database schema setup for the Walking App
-- This file combines all migrations in the correct order for initial setup
-- Date: 2026-01-18
--
-- IMPORTANT: Run this script in Supabase SQL Editor to set up the database
--
-- What this script creates:
-- - Users table with profile data and QR codes
-- - Step entries table for daily step tracking
-- - Friendships table for social connections
-- - Groups and group memberships for competitions
-- - Invite codes for QR and link-based invitations
-- - RLS policies for secure data access
-- - Helper functions for discovery, search, and leaderboards
-- - Performance indexes for efficient queries
--
-- Execution time: Approximately 5-10 seconds
-- ============================================================================

-- ============================================================================
-- MIGRATION 002: Create Users Table
-- ============================================================================
-- Description: Creates the users table for storing user profile data
-- Dependencies: None (auth.users table exists by default in Supabase)
-- Tables created: users
-- Functions created: update_updated_at_column()
-- ============================================================================

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on created_at for sorting
CREATE INDEX idx_users_created_at ON users(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row update
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table
COMMENT ON TABLE users IS 'User profile data linked to Supabase Auth users';
COMMENT ON COLUMN users.id IS 'User ID from auth.users';
COMMENT ON COLUMN users.display_name IS 'User display name (2-50 characters)';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSONB (units, notifications, privacy)';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user profile was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when user profile was last updated';

-- ============================================================================
-- MIGRATION 003: Create Step Entries Table
-- ============================================================================
-- Description: Creates the step_entries table for tracking daily steps
-- Dependencies: users table (from migration 002)
-- Tables created: step_entries
-- Functions created: get_daily_step_summary(), count_step_entries_in_range()
-- ============================================================================

-- Create step_entries table
CREATE TABLE step_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    step_count INTEGER NOT NULL CHECK (step_count >= 0),
    distance_meters DOUBLE PRECISION CHECK (distance_meters >= 0),
    date DATE NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT,

    CONSTRAINT unique_user_date_source UNIQUE (user_id, date, source)
);

-- Create indexes for efficient querying
CREATE INDEX idx_step_entries_user_date ON step_entries(user_id, date);
CREATE INDEX idx_step_entries_date ON step_entries(date);

-- Enable Row Level Security
ALTER TABLE step_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own steps
CREATE POLICY "Users can view own steps"
    ON step_entries FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own steps
CREATE POLICY "Users can insert own steps"
    ON step_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own steps
CREATE POLICY "Users can update own steps"
    ON step_entries FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own steps
CREATE POLICY "Users can delete own steps"
    ON step_entries FOR DELETE
    USING (auth.uid() = user_id);

-- Create database function for daily step aggregation
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
AS $$
    SELECT
        date,
        SUM(step_count) as total_steps,
        COALESCE(SUM(distance_meters), 0) as total_distance_meters,
        COUNT(*) as entry_count
    FROM step_entries
    WHERE user_id = p_user_id
      AND date BETWEEN p_start_date AND p_end_date
    GROUP BY date
    ORDER BY date DESC;
$$;

-- Create database function for efficient count queries
CREATE OR REPLACE FUNCTION count_step_entries_in_range(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)
    FROM step_entries
    WHERE user_id = p_user_id
      AND date BETWEEN p_start_date AND p_end_date;
$$;

-- Add comments to table and columns
COMMENT ON TABLE step_entries IS 'Daily step count entries recorded by users from various sources';
COMMENT ON COLUMN step_entries.id IS 'Unique identifier for the step entry';
COMMENT ON COLUMN step_entries.user_id IS 'User ID from auth.users who recorded the steps';
COMMENT ON COLUMN step_entries.step_count IS 'Number of steps recorded (0-200000)';
COMMENT ON COLUMN step_entries.distance_meters IS 'Optional distance in meters';
COMMENT ON COLUMN step_entries.date IS 'Date when steps were recorded (cannot be in future)';
COMMENT ON COLUMN step_entries.recorded_at IS 'Timestamp when the entry was created';
COMMENT ON COLUMN step_entries.source IS 'Source of the step data (e.g., apple_health, google_fit, manual)';
COMMENT ON FUNCTION get_daily_step_summary IS 'Aggregates step entries by date for a user within a date range';
COMMENT ON FUNCTION count_step_entries_in_range IS 'Efficiently counts step entries in a date range for pagination';

-- ============================================================================
-- MIGRATION 004: Create Friendships Table
-- ============================================================================
-- Description: Creates the friendships table for managing friend relationships
-- Dependencies: users, step_entries tables (from migrations 002-003)
-- Tables created: friendships
-- Functions created: get_friend_ids()
-- RLS updates: Adds friend visibility policies to users and step_entries
-- ============================================================================

-- Create friendships table
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,

    CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
    CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Enable Row Level Security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view friendships they're part of
CREATE POLICY "Users can view own friendships"
    ON friendships FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- RLS Policy: Users can send friend requests (insert as requester)
CREATE POLICY "Users can send friend requests"
    ON friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id AND status = 'pending');

-- RLS Policy: Addressee can update status (accept/reject)
CREATE POLICY "Addressee can respond to requests"
    ON friendships FOR UPDATE
    USING (auth.uid() = addressee_id AND status = 'pending')
    WITH CHECK (auth.uid() = addressee_id);

-- RLS Policy: Either party can delete friendship
CREATE POLICY "Users can remove friendships"
    ON friendships FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Create helper function for getting friend IDs
CREATE OR REPLACE FUNCTION get_friend_ids(p_user_id UUID)
RETURNS TABLE (friend_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT CASE
        WHEN requester_id = p_user_id THEN addressee_id
        ELSE requester_id
    END as friend_id
    FROM friendships
    WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
      AND status = 'accepted';
$$;

-- Add RLS policy to users table to allow friends to view each other's profiles
CREATE POLICY "Users can view friends profiles"
    ON users FOR SELECT
    USING (
        id = auth.uid() OR
        id IN (
            SELECT CASE
                WHEN requester_id = auth.uid() THEN addressee_id
                ELSE requester_id
            END
            FROM friendships
            WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
              AND status = 'accepted'
        )
    );

-- Add RLS policy to step_entries table to allow friends to view each other's steps
CREATE POLICY "Users can view friends steps"
    ON step_entries FOR SELECT
    USING (
        user_id = auth.uid() OR
        user_id IN (
            SELECT CASE
                WHEN requester_id = auth.uid() THEN addressee_id
                ELSE requester_id
            END
            FROM friendships
            WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
              AND status = 'accepted'
        )
    );

-- Add comments to table and columns
COMMENT ON TABLE friendships IS 'Friendship relationships between users';
COMMENT ON COLUMN friendships.id IS 'Unique identifier for the friendship';
COMMENT ON COLUMN friendships.requester_id IS 'ID of the user who sent the friend request';
COMMENT ON COLUMN friendships.addressee_id IS 'ID of the user who received the friend request';
COMMENT ON COLUMN friendships.status IS 'Status of the friendship: pending, accepted, rejected, or blocked';
COMMENT ON COLUMN friendships.created_at IS 'Timestamp when the friend request was created';
COMMENT ON COLUMN friendships.accepted_at IS 'Timestamp when the friend request was accepted';

-- ============================================================================
-- MIGRATION 005: Update Friendships RLS for Blocking
-- ============================================================================
-- Description: Adds RLS policies to support blocking functionality
-- Dependencies: friendships table (from migration 004)
-- RLS updates: Adds blocking policy and updates INSERT policy
-- ============================================================================

-- Add new RLS policy to allow users to block other users
-- This allows both requester and addressee to update a friendship to 'blocked' status
CREATE POLICY "Users can block friendships"
    ON friendships FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
    WITH CHECK ((auth.uid() = requester_id OR auth.uid() = addressee_id) AND status = 'blocked');

-- Update INSERT policy to allow creating blocked relationships directly
-- This is needed when blocking a user with whom there's no existing friendship
DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;

CREATE POLICY "Users can send friend requests"
    ON friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id AND (status = 'pending' OR status = 'blocked'));

-- ============================================================================
-- MIGRATION 006: Create Groups Tables
-- ============================================================================
-- Description: Creates groups and group_memberships tables for competitions
-- Dependencies: users, step_entries tables (for leaderboard)
-- Tables created: groups, group_memberships
-- Functions created: get_group_leaderboard(), get_competition_period_dates()
-- ============================================================================

-- Create groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 50),
    description TEXT,
    created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN NOT NULL DEFAULT false,
    join_code TEXT UNIQUE,
    period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'custom')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_groups_join_code ON groups(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX idx_groups_is_public ON groups(is_public);
CREATE INDEX idx_groups_created_by ON groups(created_by_id);

-- Create group_memberships table
CREATE TABLE group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_group_membership UNIQUE (group_id, user_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_role ON group_memberships(role);

-- Enable Row Level Security on groups table
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view public groups
CREATE POLICY "Anyone can view public groups"
    ON groups FOR SELECT
    USING (is_public = true);

-- RLS Policy: Members can view their groups
CREATE POLICY "Members can view their groups"
    ON groups FOR SELECT
    USING (
        id IN (
            SELECT group_id FROM group_memberships
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Authenticated users can create groups
CREATE POLICY "Users can create groups"
    ON groups FOR INSERT
    WITH CHECK (auth.uid() = created_by_id);

-- RLS Policy: Owner/Admin can update groups
CREATE POLICY "Admins can update groups"
    ON groups FOR UPDATE
    USING (
        id IN (
            SELECT group_id FROM group_memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS Policy: Only owner can delete group
CREATE POLICY "Owner can delete group"
    ON groups FOR DELETE
    USING (
        id IN (
            SELECT group_id FROM group_memberships
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- Enable Row Level Security on group_memberships table
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Members can view memberships in their groups
CREATE POLICY "Members can view group memberships"
    ON group_memberships FOR SELECT
    USING (
        group_id IN (
            SELECT group_id FROM group_memberships
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can join groups
CREATE POLICY "Users can join groups"
    ON group_memberships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can leave groups (delete own membership)
CREATE POLICY "Users can leave groups"
    ON group_memberships FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policy: Admins can remove members
CREATE POLICY "Admins can manage members"
    ON group_memberships FOR DELETE
    USING (
        group_id IN (
            SELECT group_id FROM group_memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS Policy: Admins can update member roles
CREATE POLICY "Admins can update member roles"
    ON group_memberships FOR UPDATE
    USING (
        group_id IN (
            SELECT group_id FROM group_memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Create function to get group leaderboard
CREATE OR REPLACE FUNCTION get_group_leaderboard(
    p_group_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    total_steps BIGINT,
    total_distance_meters DOUBLE PRECISION
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(se.step_count), 0) DESC) as rank,
        gm.user_id,
        u.display_name,
        u.avatar_url,
        COALESCE(SUM(se.step_count), 0) as total_steps,
        COALESCE(SUM(se.distance_meters), 0) as total_distance_meters
    FROM group_memberships gm
    JOIN users u ON u.id = gm.user_id
    LEFT JOIN step_entries se ON se.user_id = gm.user_id
        AND se.date BETWEEN p_start_date AND p_end_date
    WHERE gm.group_id = p_group_id
    GROUP BY gm.user_id, u.display_name, u.avatar_url
    ORDER BY total_steps DESC;
$$;

-- Create function for competition period calculation
CREATE OR REPLACE FUNCTION get_competition_period_dates(
    p_period_type TEXT,
    p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (start_date DATE, end_date DATE)
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT
        CASE p_period_type
            WHEN 'daily' THEN p_reference_date
            WHEN 'weekly' THEN date_trunc('week', p_reference_date)::DATE
            WHEN 'monthly' THEN date_trunc('month', p_reference_date)::DATE
            ELSE p_reference_date
        END as start_date,
        CASE p_period_type
            WHEN 'daily' THEN p_reference_date
            WHEN 'weekly' THEN (date_trunc('week', p_reference_date) + INTERVAL '6 days')::DATE
            WHEN 'monthly' THEN (date_trunc('month', p_reference_date) + INTERVAL '1 month - 1 day')::DATE
            ELSE p_reference_date
        END as end_date;
$$;

-- Add comments to tables and columns
COMMENT ON TABLE groups IS 'Groups for competitive walking challenges';
COMMENT ON COLUMN groups.id IS 'Unique identifier for the group';
COMMENT ON COLUMN groups.name IS 'Name of the group (2-50 characters)';
COMMENT ON COLUMN groups.description IS 'Optional description of the group';
COMMENT ON COLUMN groups.created_by_id IS 'ID of the user who created the group';
COMMENT ON COLUMN groups.is_public IS 'Whether the group is public (anyone can join) or private (requires join code)';
COMMENT ON COLUMN groups.join_code IS 'Join code for private groups (null for public groups)';
COMMENT ON COLUMN groups.period_type IS 'Competition period type: daily, weekly, monthly, or custom';
COMMENT ON COLUMN groups.created_at IS 'Timestamp when the group was created';

COMMENT ON TABLE group_memberships IS 'Membership relationships between users and groups';
COMMENT ON COLUMN group_memberships.id IS 'Unique identifier for the membership';
COMMENT ON COLUMN group_memberships.group_id IS 'ID of the group';
COMMENT ON COLUMN group_memberships.user_id IS 'ID of the user';
COMMENT ON COLUMN group_memberships.role IS 'Role of the user in the group: owner, admin, or member';
COMMENT ON COLUMN group_memberships.joined_at IS 'Timestamp when the user joined the group';

COMMENT ON FUNCTION get_group_leaderboard IS 'Calculates the leaderboard for a group within a date range';
COMMENT ON FUNCTION get_competition_period_dates IS 'Calculates the start and end dates for a competition period type';

-- ============================================================================
-- MIGRATION 007: Add QR Code ID to Users
-- ============================================================================
-- Description: Adds unique QR code identifier to each user
-- Dependencies: users table (from migration 002)
-- Columns added: users.qr_code_id
-- ============================================================================

-- Add qr_code_id column to users table
ALTER TABLE users ADD COLUMN qr_code_id TEXT;

-- Generate unique QR code IDs for existing users
UPDATE users SET qr_code_id = encode(gen_random_bytes(8), 'hex') WHERE qr_code_id IS NULL;

-- Make qr_code_id NOT NULL after populating existing rows
ALTER TABLE users ALTER COLUMN qr_code_id SET NOT NULL;

-- Add unique constraint
ALTER TABLE users ADD CONSTRAINT users_qr_code_id_unique UNIQUE (qr_code_id);

-- Set default for new users
ALTER TABLE users ALTER COLUMN qr_code_id SET DEFAULT encode(gen_random_bytes(8), 'hex');

-- Create index for QR code lookups
CREATE INDEX idx_users_qr_code_id ON users(qr_code_id);

-- Add comment
COMMENT ON COLUMN users.qr_code_id IS 'Unique cryptographically random identifier for QR code generation';

-- ============================================================================
-- MIGRATION 008: Add User Search Indexes
-- ============================================================================
-- Description: Adds trigram and case-insensitive indexes for user search
-- Dependencies: users table (from migration 002)
-- Extensions: pg_trgm
-- Indexes added: idx_users_display_name_trgm, idx_users_display_name_lower
-- ============================================================================

-- Enable pg_trgm extension for trigram matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram index on display_name for fuzzy search
CREATE INDEX idx_users_display_name_trgm ON users USING GIN (display_name gin_trgm_ops);

-- Create index on lowercase display_name for case-insensitive exact/prefix search
CREATE INDEX idx_users_display_name_lower ON users (LOWER(display_name));

-- Add comments
COMMENT ON INDEX idx_users_display_name_trgm IS 'Trigram index for fuzzy search on display_name';
COMMENT ON INDEX idx_users_display_name_lower IS 'Case-insensitive index for exact/prefix search on display_name';

-- ============================================================================
-- MIGRATION 009: Create Invite Codes Table
-- ============================================================================
-- Description: Creates invite_codes table for QR and link-based invitations
-- Dependencies: users table (from migration 002)
-- Tables created: invite_codes
-- ============================================================================

-- Create invite_codes table
CREATE TABLE invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('qr_code', 'share_link')),
    expires_at TIMESTAMPTZ,
    max_usages INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_invite_codes_user_id ON invite_codes(user_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_type ON invite_codes(type);
CREATE INDEX idx_invite_codes_expires_at ON invite_codes(expires_at);

-- Enable Row Level Security
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own invite codes
CREATE POLICY "Users can view own invite codes"
    ON invite_codes FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own invite codes
CREATE POLICY "Users can insert own invite codes"
    ON invite_codes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own invite codes
CREATE POLICY "Users can update own invite codes"
    ON invite_codes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own invite codes
CREATE POLICY "Users can delete own invite codes"
    ON invite_codes FOR DELETE
    USING (auth.uid() = user_id);

-- Note: We do NOT create a policy for anyone to read invite codes.
-- The validate_invite_code function uses SECURITY DEFINER to bypass RLS
-- when validating codes. This prevents users from querying all invite codes
-- and exposing user IDs, expiration times, and usage counts.

-- Add comments
COMMENT ON TABLE invite_codes IS 'Invite codes for QR codes and shareable links';
COMMENT ON COLUMN invite_codes.id IS 'Unique identifier for the invite code';
COMMENT ON COLUMN invite_codes.user_id IS 'User who created the invite code';
COMMENT ON COLUMN invite_codes.code IS 'The invite code (cryptographically random)';
COMMENT ON COLUMN invite_codes.type IS 'Type of invite code: qr_code or share_link';
COMMENT ON COLUMN invite_codes.expires_at IS 'Optional expiration timestamp';
COMMENT ON COLUMN invite_codes.max_usages IS 'Optional maximum number of usages';
COMMENT ON COLUMN invite_codes.usage_count IS 'Number of times the code has been used';
COMMENT ON COLUMN invite_codes.created_at IS 'Timestamp when the code was created';

-- ============================================================================
-- MIGRATION 010: Create Discovery Functions
-- ============================================================================
-- Description: Creates database functions for user search and discovery
-- Dependencies: users, friendships, invite_codes tables
-- Functions created: search_users(), get_user_by_qr_code(), validate_invite_code()
-- ============================================================================

-- Function: Search users by display name with friendship status
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
    WHERE u.id != requesting_user_id
      AND (
          LOWER(u.display_name) LIKE LOWER('%' || search_query || '%')
          OR u.display_name % search_query  -- Trigram similarity
      )
    ORDER BY
        similarity(u.display_name, search_query) DESC,
        u.display_name
    LIMIT 50;
    -- Performance Note: Similarity scoring requires computing trigram similarity for all matching rows.
    -- The LIMIT 50 helps constrain this, but with a large user base, consider adding a minimum
    -- similarity threshold in the WHERE clause or implementing pagination for better performance.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user by QR code ID
CREATE OR REPLACE FUNCTION get_user_by_qr_code(
    qr_code TEXT
)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    -- Authorization check: verify user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: user must be authenticated';
    END IF;

    RETURN QUERY
    SELECT u.id, u.display_name, u.avatar_url
    FROM users u
    WHERE u.qr_code_id = qr_code
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate and increment invite code usage
CREATE OR REPLACE FUNCTION validate_invite_code(
    code_to_validate TEXT
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    error_message TEXT
) AS $$
DECLARE
    invite_record RECORD;
    validated_user_id UUID;
BEGIN
    -- Authorization check: verify user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: user must be authenticated';
    END IF;

    -- Find the invite code (without incrementing yet)
    SELECT * INTO invite_record
    FROM invite_codes
    WHERE code = code_to_validate;

    -- Check if code exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite code not found';
        RETURN;
    END IF;

    -- Check if code has expired
    IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite code has expired';
        RETURN;
    END IF;

    -- Atomically increment usage count and return user_id only if under limit
    -- This prevents race conditions by combining the check and increment in one atomic operation
    UPDATE invite_codes
    SET usage_count = usage_count + 1
    WHERE code = code_to_validate
      AND (max_usages IS NULL OR usage_count < max_usages)
    RETURNING invite_codes.user_id INTO validated_user_id;

    -- Check if the update succeeded (code was under limit)
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite code has reached maximum usage limit';
        RETURN;
    END IF;

    -- Return success
    RETURN QUERY SELECT TRUE, validated_user_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION search_users IS 'Search users by display name and return with friendship status';
COMMENT ON FUNCTION get_user_by_qr_code IS 'Get user information by QR code identifier';
COMMENT ON FUNCTION validate_invite_code IS 'Validate an invite code and increment usage count if valid';

-- ============================================================================
-- Setup Complete!
-- ============================================================================
-- Your Walking App database is now fully configured.
--
-- Next steps:
-- 1. Verify tables were created: Go to "Table Editor" in Supabase Dashboard
-- 2. Test a query: SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- 3. Update your mobile app .env file with Supabase credentials
-- 4. Start the mobile app and test authentication
--
-- Tables created:
-- - users (with qr_code_id for friend discovery)
-- - step_entries (for tracking daily steps)
-- - friendships (for social connections)
-- - groups (for walking competitions)
-- - group_memberships (for group participation)
-- - invite_codes (for QR and link-based invitations)
--
-- Functions created:
-- - update_updated_at_column() - Auto-updates timestamps
-- - get_daily_step_summary() - Aggregates daily steps
-- - count_step_entries_in_range() - Counts entries in date range
-- - get_friend_ids() - Returns user's accepted friend IDs
-- - get_group_leaderboard() - Calculates group rankings
-- - get_competition_period_dates() - Calculates period dates
-- - search_users() - Search users by display name
-- - get_user_by_qr_code() - Find user by QR code
-- - validate_invite_code() - Validate and use invite codes
--
-- All tables have Row Level Security (RLS) enabled with appropriate policies.
-- ============================================================================

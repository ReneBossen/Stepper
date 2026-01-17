-- Migration: Create groups and group_memberships tables
-- Description: Creates the groups and group_memberships tables for managing group competitions with RLS policies and helper functions
-- Date: 2026-01-17
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the tables, policies, and functions were created successfully
-- 8. Test with a simple SELECT query: SELECT * FROM groups LIMIT 1;

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

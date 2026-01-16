-- Migration: Create users table
-- Description: Creates the users table for storing user profile data linked to Supabase Auth
-- Date: 2026-01-16

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

-- RLS Policy: Users can view friends' profiles (for social features)
-- Note: This policy depends on the friendships table which will be created in a future migration
-- It's included here for completeness but won't be effective until Plan 4 is implemented
CREATE POLICY "Users can view friends profiles"
    ON users FOR SELECT
    USING (
        id IN (
            SELECT friend_id FROM friendships
            WHERE user_id = auth.uid() AND status = 'accepted'
        )
    );

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

-- Add comment to table
COMMENT ON TABLE users IS 'User profile data linked to Supabase Auth users';
COMMENT ON COLUMN users.id IS 'User ID from auth.users';
COMMENT ON COLUMN users.display_name IS 'User display name (2-50 characters)';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSONB (units, notifications, privacy)';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user profile was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when user profile was last updated';

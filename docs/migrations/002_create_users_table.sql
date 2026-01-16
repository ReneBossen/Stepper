-- Migration: Create users table
-- Description: Creates the users table for storing user profile data linked to Supabase Auth
-- Date: 2026-01-16
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the tables, policies, and triggers were created successfully
-- 8. Test with a simple SELECT query: SELECT * FROM users LIMIT 1;

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
-- Note: This policy will be added in the friendships migration (Plan 4)
-- Uncommented here because the friendships table doesn't exist yet and would cause the policy to fail
--
-- CREATE POLICY "Users can view friends profiles"
--     ON users FOR SELECT
--     USING (
--         id IN (
--             SELECT friend_id FROM friendships
--             WHERE user_id = auth.uid() AND status = 'accepted'
--         )
--     );

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

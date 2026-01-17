-- Migration: Create invite_codes table
-- Description: Creates the invite_codes table for QR codes and shareable invite links
-- Date: 2026-01-17
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the table, policies, and indexes were created successfully
-- 8. Test with a simple SELECT query: SELECT * FROM invite_codes LIMIT 1;

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

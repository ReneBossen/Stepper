-- Migration: Update friendships RLS policies to support blocking
-- Description: Adds a new RLS policy to allow users to block other users by updating friendships to 'blocked' status
-- Date: 2026-01-17
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the policy was created successfully

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

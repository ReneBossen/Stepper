-- Migration: Add onboarding_completed field to users table
-- Description: Adds a boolean field to track if user has completed onboarding
-- Date: 2026-01-18
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the column was added: SELECT id, onboarding_completed FROM users LIMIT 5;

-- Add onboarding_completed column to users table
ALTER TABLE users
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;

-- Add comment to column
COMMENT ON COLUMN users.onboarding_completed IS 'Indicates whether the user has completed the onboarding flow';

-- Update existing users to have onboarding_completed = true (backward compatibility)
-- Existing users should not see onboarding again
UPDATE users SET onboarding_completed = true WHERE onboarding_completed IS NULL;

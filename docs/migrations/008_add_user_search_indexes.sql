-- Migration: Add search indexes to users table
-- Description: Adds trigram and case-insensitive indexes on display_name for user search
-- Date: 2026-01-17
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the indexes were created successfully
-- 8. Test search with: SELECT * FROM users WHERE LOWER(display_name) LIKE LOWER('%test%');

-- Enable pg_trgm extension for trigram matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram index on display_name for fuzzy search
CREATE INDEX idx_users_display_name_trgm ON users USING GIN (display_name gin_trgm_ops);

-- Create index on lowercase display_name for case-insensitive exact/prefix search
CREATE INDEX idx_users_display_name_lower ON users (LOWER(display_name));

-- Add comments
COMMENT ON INDEX idx_users_display_name_trgm IS 'Trigram index for fuzzy search on display_name';
COMMENT ON INDEX idx_users_display_name_lower IS 'Case-insensitive index for exact/prefix search on display_name';

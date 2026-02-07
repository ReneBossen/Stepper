-- Migration: Drop deprecated preferences JSONB column from users table
-- Description: The preferences JSONB column on the users table was superseded by the
--              dedicated user_preferences table (created in 20260119150000). All application
--              code now reads/writes preferences via UserPreferencesRepository. This migration
--              removes the dead column to prevent confusion.
-- Author: Database Engineer
-- Date: 2026-02-07
-- References: BE-001 technical debt item

ALTER TABLE users DROP COLUMN IF EXISTS preferences;

COMMENT ON TABLE users IS
    'User profiles linked to Supabase auth.users. Preferences are stored in the '
    'separate user_preferences table.';

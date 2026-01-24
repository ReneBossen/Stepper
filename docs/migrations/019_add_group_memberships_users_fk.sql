-- Migration: Add foreign key from group_memberships to users table
-- Description: Adds a foreign key constraint from group_memberships.user_id to users.id
--              to enable PostgREST/Supabase to recognize the relationship for joins
-- Author: Database Engineer Agent
-- Date: 2026-01-24

-- ============================================================================
-- PROBLEM
-- ============================================================================
-- The error "Could not find a relationship between 'group_memberships' and 'users'
-- in the schema cache" occurs because:
--   - group_memberships.user_id references auth.users(id)
--   - users.id also references auth.users(id)
--   - But there's no direct FK from group_memberships.user_id to users.id
--
-- PostgREST can't automatically join these tables without a direct FK relationship.

-- ============================================================================
-- FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Add foreign key from group_memberships.user_id to users.id
-- This enables Supabase/PostgREST to join group_memberships with users table
-- Note: We keep the existing FK to auth.users(id) for cascade delete behavior
ALTER TABLE group_memberships
ADD CONSTRAINT fk_group_memberships_users
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT fk_group_memberships_users ON group_memberships
IS 'Foreign key to users table for PostgREST relationship discovery';

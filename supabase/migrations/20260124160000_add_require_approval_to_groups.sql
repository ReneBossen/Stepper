-- Migration: Add require_approval column to groups table
-- Description: Adds a boolean column to control whether new members need admin approval to join
-- Author: Database Engineer Agent
-- Date: 2026-01-24

-- ============================================================================
-- COLUMNS
-- ============================================================================

-- Add require_approval column to groups table
-- Default is false (new members can join without approval)
ALTER TABLE groups
ADD COLUMN require_approval BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN groups.require_approval IS 'Whether new members require admin approval to join';

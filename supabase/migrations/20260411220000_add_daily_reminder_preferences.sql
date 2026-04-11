-- Migration: Add daily reminder preference columns
-- Description: Adds notify_daily_reminder and daily_reminder_time columns to user_preferences.
--              These columns were referenced in the API entity but never created in the database,
--              causing PostgrestException on user profile creation/load.
-- Date: 2026-04-11

-- Daily reminder toggle (matches other notify_* columns pattern)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS notify_daily_reminder BOOLEAN DEFAULT true;

-- Time of day for the daily reminder (nullable - null means no specific time set)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS daily_reminder_time TIME DEFAULT NULL;

-- Comments
COMMENT ON COLUMN user_preferences.notify_daily_reminder IS 'Enable daily step reminder notifications';
COMMENT ON COLUMN user_preferences.daily_reminder_time IS 'Preferred time of day for daily reminder (nullable)';

-- Migration: Create step_entries table
-- Description: Creates the step_entries table for storing step count data with RLS policies
-- Date: 2026-01-16
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the tables, policies, and functions were created successfully
-- 8. Test with a simple SELECT query: SELECT * FROM step_entries LIMIT 1;

-- Create step_entries table
CREATE TABLE step_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    step_count INTEGER NOT NULL CHECK (step_count >= 0),
    distance_meters DOUBLE PRECISION CHECK (distance_meters >= 0),
    date DATE NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT,

    CONSTRAINT unique_user_date_source UNIQUE (user_id, date, source)
);

-- Create indexes for efficient querying
CREATE INDEX idx_step_entries_user_date ON step_entries(user_id, date);
CREATE INDEX idx_step_entries_date ON step_entries(date);

-- Enable Row Level Security
ALTER TABLE step_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own steps
CREATE POLICY "Users can view own steps"
    ON step_entries FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own steps
CREATE POLICY "Users can insert own steps"
    ON step_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own steps
CREATE POLICY "Users can update own steps"
    ON step_entries FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own steps
CREATE POLICY "Users can delete own steps"
    ON step_entries FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policy: Friends can view steps (will be enabled in Plan 4)
-- Note: This policy is commented out because the friendships table doesn't exist yet
--
-- CREATE POLICY "Friends can view steps"
--     ON step_entries FOR SELECT
--     USING (
--         user_id IN (
--             SELECT friend_id FROM friendships
--             WHERE user_id = auth.uid() AND status = 'accepted'
--         )
--     );

-- Create database function for daily step aggregation
CREATE OR REPLACE FUNCTION get_daily_step_summary(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    date DATE,
    total_steps BIGINT,
    total_distance_meters DOUBLE PRECISION,
    entry_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        date,
        SUM(step_count) as total_steps,
        COALESCE(SUM(distance_meters), 0) as total_distance_meters,
        COUNT(*) as entry_count
    FROM step_entries
    WHERE user_id = p_user_id
      AND date BETWEEN p_start_date AND p_end_date
    GROUP BY date
    ORDER BY date DESC;
$$;

-- Create database function for efficient count queries
CREATE OR REPLACE FUNCTION count_step_entries_in_range(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)
    FROM step_entries
    WHERE user_id = p_user_id
      AND date BETWEEN p_start_date AND p_end_date;
$$;

-- Add comments to table and columns
COMMENT ON TABLE step_entries IS 'Daily step count entries recorded by users from various sources';
COMMENT ON COLUMN step_entries.id IS 'Unique identifier for the step entry';
COMMENT ON COLUMN step_entries.user_id IS 'User ID from auth.users who recorded the steps';
COMMENT ON COLUMN step_entries.step_count IS 'Number of steps recorded (0-200000)';
COMMENT ON COLUMN step_entries.distance_meters IS 'Optional distance in meters';
COMMENT ON COLUMN step_entries.date IS 'Date when steps were recorded (cannot be in future)';
COMMENT ON COLUMN step_entries.recorded_at IS 'Timestamp when the entry was created';
COMMENT ON COLUMN step_entries.source IS 'Source of the step data (e.g., apple_health, google_fit, manual)';
COMMENT ON FUNCTION get_daily_step_summary IS 'Aggregates step entries by date for a user within a date range';
COMMENT ON FUNCTION count_step_entries_in_range IS 'Efficiently counts step entries in a date range for pagination';

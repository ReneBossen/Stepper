-- Migration: Add qr_code_id to users table
-- Description: Adds a unique QR code identifier to each user for friend discovery via QR scanning
-- Date: 2026-01-17
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the column was added successfully
-- 8. Test with a simple SELECT query: SELECT id, qr_code_id FROM users LIMIT 5;

-- Add qr_code_id column to users table
ALTER TABLE users ADD COLUMN qr_code_id TEXT;

-- Generate unique QR code IDs for existing users
UPDATE users SET qr_code_id = encode(gen_random_bytes(8), 'hex') WHERE qr_code_id IS NULL;

-- Make qr_code_id NOT NULL after populating existing rows
ALTER TABLE users ALTER COLUMN qr_code_id SET NOT NULL;

-- Add unique constraint
ALTER TABLE users ADD CONSTRAINT users_qr_code_id_unique UNIQUE (qr_code_id);

-- Set default for new users
ALTER TABLE users ALTER COLUMN qr_code_id SET DEFAULT encode(gen_random_bytes(8), 'hex');

-- Create index for QR code lookups
CREATE INDEX idx_users_qr_code_id ON users(qr_code_id);

-- Add comment
COMMENT ON COLUMN users.qr_code_id IS 'Unique cryptographically random identifier for QR code generation';

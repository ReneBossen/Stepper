-- Migration: Create friend discovery database functions
-- Description: Creates database functions for user search, invite code validation, and QR code lookup
-- Date: 2026-01-17
--
-- Execution Instructions:
-- 1. Log in to Supabase Dashboard (https://app.supabase.com)
-- 2. Navigate to your project
-- 3. Go to the SQL Editor section
-- 4. Create a new query
-- 5. Copy and paste this entire migration script
-- 6. Click "Run" to execute the migration
-- 7. Verify the functions were created successfully
-- 8. Test with: SELECT * FROM search_users('test', auth.uid()) LIMIT 5;

-- Function: Search users by display name with friendship status
CREATE OR REPLACE FUNCTION search_users(
    search_query TEXT,
    requesting_user_id UUID
)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    avatar_url TEXT,
    friendship_status TEXT
) AS $$
BEGIN
    -- Authorization check: verify requesting_user_id matches authenticated user
    IF requesting_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: requesting_user_id must match authenticated user';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.display_name,
        u.avatar_url,
        COALESCE(
            (SELECT f.status::TEXT
             FROM friendships f
             WHERE (f.user_id = requesting_user_id AND f.friend_id = u.id)
                OR (f.friend_id = requesting_user_id AND f.user_id = u.id)
             LIMIT 1),
            'none'
        ) AS friendship_status
    FROM users u
    WHERE u.id != requesting_user_id
      AND (
          LOWER(u.display_name) LIKE LOWER('%' || search_query || '%')
          OR u.display_name % search_query  -- Trigram similarity
      )
    ORDER BY
        similarity(u.display_name, search_query) DESC,
        u.display_name
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user by QR code ID
CREATE OR REPLACE FUNCTION get_user_by_qr_code(
    qr_code TEXT
)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    -- Authorization check: verify user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: user must be authenticated';
    END IF;

    RETURN QUERY
    SELECT u.id, u.display_name, u.avatar_url
    FROM users u
    WHERE u.qr_code_id = qr_code
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate and increment invite code usage
CREATE OR REPLACE FUNCTION validate_invite_code(
    code_to_validate TEXT
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    error_message TEXT
) AS $$
DECLARE
    invite_record RECORD;
    validated_user_id UUID;
BEGIN
    -- Authorization check: verify user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: user must be authenticated';
    END IF;

    -- Find the invite code (without incrementing yet)
    SELECT * INTO invite_record
    FROM invite_codes
    WHERE code = code_to_validate;

    -- Check if code exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite code not found';
        RETURN;
    END IF;

    -- Check if code has expired
    IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite code has expired';
        RETURN;
    END IF;

    -- Atomically increment usage count and return user_id only if under limit
    -- This prevents race conditions by combining the check and increment in one atomic operation
    UPDATE invite_codes
    SET usage_count = usage_count + 1
    WHERE code = code_to_validate
      AND (max_usages IS NULL OR usage_count < max_usages)
    RETURNING invite_codes.user_id INTO validated_user_id;

    -- Check if the update succeeded (code was under limit)
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite code has reached maximum usage limit';
        RETURN;
    END IF;

    -- Return success
    RETURN QUERY SELECT TRUE, validated_user_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION search_users IS 'Search users by display name and return with friendship status';
COMMENT ON FUNCTION get_user_by_qr_code IS 'Get user information by QR code identifier';
COMMENT ON FUNCTION validate_invite_code IS 'Validate an invite code and increment usage count if valid';

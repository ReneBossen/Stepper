-- Migration: Harden invite_codes RLS and validate_invite_code function
-- Description: Tightens the invite_codes table as part of the rls-policies-
--              hardening branch (table 8 of 10). No known bug — audit-driven.
--
--              Gaps closed:
--                1. UPDATE policy was `auth.uid() = user_id` with no column
--                   restriction, letting a user reset their own `usage_count`
--                   and exceed `max_usages` on codes they own. There is no
--                   legitimate client update path — validation increments
--                   atomically inside validate_invite_code, and regeneration
--                   is a new-row + delete.
--                2. validate_invite_code (SECURITY DEFINER) did not pin
--                   search_path, leaving it vulnerable to search-path
--                   hijacking. Every SECURITY DEFINER in the groups hardening
--                   migration sets search_path = public; this matches.
--                3. EXECUTE on validate_invite_code was the Postgres default
--                   (PUBLIC). Locked to `authenticated` only. The in-body
--                   auth.uid() IS NULL check stays as defence-in-depth.
--                4. No data-integrity CHECK constraints on usage_count,
--                   max_usages, or expires_at.
--
--              Out of scope: tables 1-4, 9, 10 (separate dialog iterations).

-- 1. Drop the UPDATE policy. No legitimate client update path.
DROP POLICY IF EXISTS "Users can update own invite codes" ON invite_codes;

-- 2. Data-integrity constraints.
ALTER TABLE invite_codes
    ADD CONSTRAINT invite_codes_usage_count_non_negative
        CHECK (usage_count >= 0),
    ADD CONSTRAINT invite_codes_max_usages_positive
        CHECK (max_usages IS NULL OR max_usages > 0),
    ADD CONSTRAINT invite_codes_expires_after_created
        CHECK (expires_at IS NULL OR expires_at > created_at);

-- 3. Rewrite validate_invite_code with pinned search_path.
CREATE OR REPLACE FUNCTION validate_invite_code(
    code_to_validate TEXT
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Atomically increment usage count and return user_id only if under limit.
    -- Combining check + increment in one UPDATE prevents race conditions.
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
$$;

-- 4. Lock EXECUTE grant to authenticated users only.
REVOKE EXECUTE ON FUNCTION validate_invite_code(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION validate_invite_code(TEXT) TO authenticated;

COMMENT ON FUNCTION validate_invite_code(TEXT) IS
    'Validates an invite code and atomically increments usage_count if valid. '
    'SECURITY DEFINER with pinned search_path; EXECUTE granted to authenticated '
    'only. Callers must be authenticated (enforced in-body as well).';

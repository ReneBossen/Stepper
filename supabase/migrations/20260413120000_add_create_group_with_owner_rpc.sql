-- Migration: Add create_group_with_owner SECURITY DEFINER RPC
-- Description: Group creation previously performed three separate inserts from
--              the authenticated client (groups, group_memberships, group_join_codes).
--              The group_memberships table has no authenticated INSERT policy,
--              and group_join_codes requires the caller to already be a group
--              owner, so neither the owner membership nor the join code row
--              could be inserted via the user's JWT. Every create attempt
--              failed with Postgres 42501 (RLS violation).
--
--              This migration adds a SECURITY DEFINER function that performs
--              all three inserts atomically while running with definer rights,
--              bypassing the RLS policies that would otherwise block the
--              authenticated role. The function still authenticates the caller
--              via auth.uid() and records them as the creator + owner, so a
--              user can only ever create a group for themselves.
-- Author: Claude
-- Date: 2026-04-13

CREATE OR REPLACE FUNCTION create_group_with_owner(
    p_name VARCHAR,
    p_description TEXT,
    p_is_public BOOLEAN,
    p_period_type VARCHAR,
    p_max_members INT,
    p_join_code VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_group_id UUID := gen_random_uuid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    INSERT INTO groups (
        id,
        name,
        description,
        created_by_id,
        is_public,
        period_type,
        max_members,
        created_at
    )
    VALUES (
        v_group_id,
        p_name,
        p_description,
        v_user_id,
        p_is_public,
        p_period_type,
        p_max_members,
        NOW()
    );

    INSERT INTO group_memberships (id, group_id, user_id, role, joined_at)
    VALUES (gen_random_uuid(), v_group_id, v_user_id, 'owner', NOW());

    IF p_join_code IS NOT NULL AND length(p_join_code) > 0 THEN
        INSERT INTO group_join_codes (group_id, join_code)
        VALUES (v_group_id, p_join_code);
    END IF;

    RETURN v_group_id;
END;
$$;

COMMENT ON FUNCTION create_group_with_owner(VARCHAR, TEXT, BOOLEAN, VARCHAR, INT, VARCHAR) IS
    'Atomically creates a group, its creator-owner membership, and (optionally) '
    'its join code row. SECURITY DEFINER bypasses RLS on groups, group_memberships, '
    'and group_join_codes, which would otherwise block the three-step insert '
    'sequence from the authenticated client. The caller is identified via '
    'auth.uid() and recorded as both created_by_id and the sole initial owner.';

GRANT EXECUTE ON FUNCTION create_group_with_owner(VARCHAR, TEXT, BOOLEAN, VARCHAR, INT, VARCHAR) TO authenticated;

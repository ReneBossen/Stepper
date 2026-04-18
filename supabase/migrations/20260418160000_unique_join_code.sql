-- Migration: Add UNIQUE constraint on group_join_codes.join_code
-- Description: Closes a data integrity gap on group_join_codes.
--              The table had UNIQUE(group_id) but not UNIQUE(join_code).
--              If two groups happened to generate the same 8-char code,
--              join_group_by_code would pick one with LIMIT 1 and the
--              other code would be silently unreachable.
--
--              Gap closed:
--                Duplicate join codes could make a group's code unreachable.
--
--              New model:
--                - Duplicate codes (if any) are regenerated in-place.
--                - UNIQUE constraint added on join_code.
--                - Redundant non-unique index dropped (the unique constraint
--                  creates its own index).
-- Author: Claude
-- Date: 2026-04-18

-- ============================================================================
-- 1. RESOLVE ANY EXISTING DUPLICATE join_code VALUES
-- ============================================================================

-- Uses the same 30-char alphabet as the C# GenerateJoinCode method:
-- ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no I, O, 0, 1 to avoid ambiguity).

DO $$
DECLARE
    v_dup RECORD;
    v_row RECORD;
    v_first BOOLEAN;
    v_new_code TEXT;
    v_alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_bytes BYTEA;
    v_exists BOOLEAN;
BEGIN
    FOR v_dup IN
        SELECT join_code
        FROM group_join_codes
        GROUP BY join_code
        HAVING count(*) > 1
    LOOP
        v_first := TRUE;
        FOR v_row IN
            SELECT id FROM group_join_codes
            WHERE join_code = v_dup.join_code
            ORDER BY created_at ASC
        LOOP
            -- Keep the first (oldest) row, regenerate the rest
            IF v_first THEN
                v_first := FALSE;
                CONTINUE;
            END IF;

            -- Generate a new unique code
            LOOP
                v_bytes := gen_random_bytes(8);
                v_new_code := '';
                FOR i IN 0..7 LOOP
                    v_new_code := v_new_code ||
                        substr(v_alphabet, (get_byte(v_bytes, i) % 30) + 1, 1);
                END LOOP;

                -- Check it doesn't collide with any existing code
                SELECT EXISTS(
                    SELECT 1 FROM group_join_codes WHERE join_code = v_new_code
                ) INTO v_exists;

                EXIT WHEN NOT v_exists;
            END LOOP;

            UPDATE group_join_codes
            SET join_code = v_new_code
            WHERE id = v_row.id;
        END LOOP;
    END LOOP;
END;
$$;

-- ============================================================================
-- 2. DROP REDUNDANT NON-UNIQUE INDEX
-- ============================================================================

-- The unique constraint below creates its own index, making this one redundant.
DROP INDEX IF EXISTS idx_group_join_codes_code;

-- ============================================================================
-- 3. ADD UNIQUE CONSTRAINT
-- ============================================================================

ALTER TABLE group_join_codes
    ADD CONSTRAINT uq_group_join_codes_join_code UNIQUE (join_code);

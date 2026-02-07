-- Repair: Fix join_code column type from TEXT to VARCHAR(8)
-- The original migration used TEXT due to a data length issue during push.
-- Since all data is test data, we delete long codes and enforce VARCHAR(8).

DELETE FROM group_join_codes WHERE length(join_code) > 8;
ALTER TABLE group_join_codes ALTER COLUMN join_code TYPE VARCHAR(8);

-- Migration: Harden notifications RLS
-- Description: Closes gaps on the notifications table as part of the RLS
--              hardening sweep tracked in docs/plans/rls-policies-hardening.md.
--
--              Gap closed:
--                1. No immutability trigger — the UPDATE policy allows changes
--                   to any column, but the only legitimate mutation is is_read
--                   (and updated_at via the existing update_updated_at_column
--                   trigger). A direct Supabase client could modify type,
--                   title, message, data, or created_at on own notifications.
--
--              New model:
--                - Immutable column trigger guards id, user_id, type, title,
--                  message, data, created_at. Only is_read and updated_at
--                  remain mutable.
--                - All existing policies (SELECT, INSERT, UPDATE, DELETE)
--                  are correctly scoped and unchanged.
--
--              Trigger ordering:
--                trg_notifications_prevent_immutable_updates (this one, 't')
--                update_notifications_updated_at             (existing, 'u')
--                Alphabetical: immutability check fires first, then
--                updated_at is set. updated_at is NOT in the immutable list,
--                so there is no conflict.
--
--              Backend and mobile are unchanged. The backend's
--              MarkAsReadAsync only changes is_read. DeleteAsync uses DELETE.
--              Neither touches immutable columns.
-- Author: Claude
-- Date: 2026-04-18

-- ============================================================================
-- 1. IMMUTABLE COLUMN TRIGGER
-- ============================================================================

-- Guarded columns:
--   id:         primary key, must never change.
--   user_id:    ownership column — changing it transfers the notification to
--               another user.
--   type:       notification type, set at creation by the backend service.
--   title:      display text, set at creation.
--   message:    display text, set at creation.
--   data:       JSONB metadata, set at creation.
--   created_at: audit column, set-once.
--
-- NOT guarded:
--   is_read:    the only legitimately mutable column (toggled by
--               MarkAsReadAsync / MarkAllAsReadAsync).
--   updated_at: auto-managed by update_notifications_updated_at trigger
--               using update_updated_at_column().

CREATE OR REPLACE FUNCTION notifications_prevent_immutable_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'notifications.id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'notifications.user_id is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.type IS DISTINCT FROM OLD.type THEN
        RAISE EXCEPTION 'notifications.type is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.title IS DISTINCT FROM OLD.title THEN
        RAISE EXCEPTION 'notifications.title is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN
        RAISE EXCEPTION 'notifications.message is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.data IS DISTINCT FROM OLD.data THEN
        RAISE EXCEPTION 'notifications.data is immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'notifications.created_at is immutable'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_prevent_immutable_updates ON notifications;
CREATE TRIGGER trg_notifications_prevent_immutable_updates
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION notifications_prevent_immutable_column_updates();

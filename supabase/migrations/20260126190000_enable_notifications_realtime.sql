-- Enable Supabase Realtime for notifications table
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

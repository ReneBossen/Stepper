# Plan 7: Notifications

## Summary

This plan implements a comprehensive notification system including push notifications via Expo Push Notifications service, an in-app notification center, and backend infrastructure for managing push tokens and sending notifications. The system supports multiple notification types (friend requests, friend accepted, group invites, milestones) with user preferences for notification control.

## Affected Feature Slices

- **Notifications**: New vertical slice (Controller, Service, Repository, Models, DTOs)
- **Common**: Push notification sender service
- **Friends**: Trigger notifications on friend request/accept
- **Groups**: Trigger notifications on group invite
- **Steps**: Trigger notifications on milestones (future)

## Proposed Types

| Type Name | Feature/Location | Responsibility |
|-----------|------------------|----------------|
| NotificationsController | Notifications/ | HTTP endpoints for notification operations |
| INotificationService | Notifications/ | Interface for notification business logic |
| NotificationService | Notifications/ | Notification management and retrieval |
| INotificationRepository | Notifications/ | Interface for notification data access |
| NotificationRepository | Notifications/ | Supabase data access for notifications |
| IPushTokenRepository | Notifications/ | Interface for push token data access |
| PushTokenRepository | Notifications/ | Supabase data access for push tokens |
| IPushNotificationSender | Common/Notifications/ | Interface for sending push notifications |
| ExpoPushNotificationSender | Common/Notifications/ | Expo Push API integration |
| Notification | Notifications/ | Domain model for notification |
| PushToken | Notifications/ | Domain model for push token |
| NotificationType | Notifications/ | Enum for notification types |

## Implementation Steps

1. **Create notifications table**:
   ```sql
   CREATE TABLE notifications (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'group_invite', 'milestone_reached')),
       title TEXT NOT NULL,
       body TEXT NOT NULL,
       data JSONB DEFAULT '{}',
       is_read BOOLEAN NOT NULL DEFAULT false,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       read_at TIMESTAMPTZ
   );
   ```

2. **Create push_tokens table**:
   ```sql
   CREATE TABLE push_tokens (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       token TEXT NOT NULL,
       platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
       device_id TEXT,
       is_active BOOLEAN NOT NULL DEFAULT true,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW(),
       last_used_at TIMESTAMPTZ
   );
   ```

3. **Create RLS policies** for both tables allowing users to view own notifications and manage tokens

4. **Create Notifications folder structure** with full vertical slice

5. **Create Common/Notifications folder** for push sender service

6. **Implement ExpoPushNotificationSender**:
   - Uses Expo Push API at `https://exp.host/--/api/v2/push/send`
   - Handles batch sending
   - Manages invalid token responses

7. **Implement NotificationService**:
   - `GetNotificationsAsync()` - Paginated retrieval
   - `GetUnreadCountAsync()` - Get unread count
   - `MarkAsReadAsync()` - Mark notifications as read
   - `CreateAndSendNotificationAsync()` - Create + push
   - `RegisterPushTokenAsync()` - Register device token
   - Check user preferences before sending

8. **Create notification templates** for each type:
   - Friend request: "{sender} wants to be your friend"
   - Friend accepted: "{friend} accepted your friend request"
   - Group invite: "{inviter} invited you to join {group}"
   - Milestone: "Congratulations! You've {milestone}"

9. **Integrate with Friends feature**:
   - Trigger notification on friend request sent
   - Trigger notification on friend request accepted

10. **Integrate with Groups feature**:
    - Trigger notification on group invite

11. **Implement NotificationsController endpoints**:
    - `GET /api/notifications` - Get paginated notifications
    - `GET /api/notifications/unread-count` - Get unread count
    - `POST /api/notifications/mark-read` - Mark as read
    - `POST /api/notifications/mark-all-read` - Mark all read
    - `DELETE /api/notifications/{id}` - Delete notification
    - `POST /api/notifications/push-token` - Register push token
    - `DELETE /api/notifications/push-token` - Unregister token

12. **Add cleanup job** for old notifications (background service)

## Dependencies

### Frontend (npm)
| Package | Version | Justification |
|---------|---------|---------------|
| expo-notifications | Latest | Push notification handling |
| expo-device | Latest | Device info for push token |

### Plan Dependencies
- Plan 1 (Supabase Integration) must be completed
- Plan 2 (Users) for user references
- Plan 4 (Friends) for friend notifications
- Plan 5 (Groups) for group notifications

## Database Changes

**New Table**: `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) |
| type | TEXT | NOT NULL, CHECK IN (...) |
| title | TEXT | NOT NULL |
| body | TEXT | NOT NULL |
| data | JSONB | DEFAULT '{}' |
| is_read | BOOLEAN | NOT NULL, DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| read_at | TIMESTAMPTZ | nullable |

**New Table**: `push_tokens`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) |
| token | TEXT | NOT NULL |
| platform | TEXT | NOT NULL, CHECK IN (ios, android) |
| device_id | TEXT | nullable |
| is_active | BOOLEAN | NOT NULL, DEFAULT true |

## Tests

**Unit Tests**:
- Get notifications returns user's notifications
- Mark as read updates is_read flag
- Send notification respects user preferences
- Push sender formats payload correctly
- Invalid tokens are deactivated

**Integration Tests**:
- GET /notifications returns paginated results
- POST /mark-read marks specific notifications
- POST /push-token registers token
- Friend request triggers notification
- Group invite triggers notification

## Acceptance Criteria

- [ ] notifications and push_tokens tables are created
- [ ] RLS policies correctly restrict access
- [ ] Users can view their notifications (paginated)
- [ ] Users can see unread notification count
- [ ] Users can mark notifications as read
- [ ] Push tokens can be registered and managed
- [ ] Push notifications are sent via Expo Push service
- [ ] Friend requests trigger notifications
- [ ] Friend accepts trigger notifications
- [ ] Group invites trigger notifications
- [ ] Notifications respect user preferences
- [ ] Invalid push tokens are deactivated

## Risks and Open Questions

| Risk/Question | Mitigation/Answer |
|--------------|-------------------|
| Expo Push service reliability | Queue failed notifications for retry |
| Push token validation/expiry | Deactivate on Expo error response |
| Notification volume at scale | Batch notifications, rate limit |
| Real-time notification updates | Use Supabase real-time subscriptions |
| Badge count synchronization | Track unread count, update on read |

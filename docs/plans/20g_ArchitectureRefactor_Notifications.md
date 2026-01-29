# Plan: Architecture Refactor - Notifications Feature

## Summary

Create a new Notifications feature slice in the backend and refactor the mobile Notifications API to route through the .NET API. The Notifications feature handles in-app notifications for friend requests, group invites, achievements, etc.

## Prerequisites

- **20a_ArchitectureRefactor_HttpClient.md** must be complete

## Affected Feature Slices

### Backend (Stepper.Api/Notifications) - NEW
- `NotificationsController.cs`: HTTP endpoints
- `NotificationService.cs` / `INotificationService.cs`: Business logic
- `NotificationRepository.cs` / `INotificationRepository.cs`: Data access
- `Notification.cs`: Domain model
- `NotificationEntity.cs`: Database entity
- `DTOs/`: Request/response types

### Mobile (Stepper.Mobile)
- `services/api/notificationsApi.ts`: Complete rewrite

## Proposed Types

### Backend - New Feature Slice

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `NotificationsController` | Notifications/ | HTTP endpoints |
| `INotificationService` | Notifications/ | Service interface |
| `NotificationService` | Notifications/ | Business logic |
| `INotificationRepository` | Notifications/ | Repository interface |
| `NotificationRepository` | Notifications/ | Data access via Supabase |
| `Notification` | Notifications/ | Domain model |
| `NotificationEntity` | Notifications/ | Database entity |
| `NotificationResponse` | Notifications/DTOs | Single notification |
| `NotificationListResponse` | Notifications/DTOs | Paginated list |
| `UnreadCountResponse` | Notifications/DTOs | Unread count |

## Implementation Steps

### Phase 1: Backend - Create Notifications Feature Slice

#### Step 1.1: Create Domain Model

Create `Stepper.Api/Notifications/Notification.cs`:
```csharp
public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; }
    public DateTime CreatedAt { get; set; }
}

public enum NotificationType
{
    FriendRequest,
    FriendRequestAccepted,
    GroupInvite,
    GroupJoinRequest,
    Achievement,
    Milestone,
    System
}
```

#### Step 1.2: Create Database Entity

Create `Stepper.Api/Notifications/NotificationEntity.cs`:
```csharp
[Table("notifications")]
internal class NotificationEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("type")]
    public string Type { get; set; } = string.Empty;

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("message")]
    public string Message { get; set; } = string.Empty;

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("related_entity_id")]
    public Guid? RelatedEntityId { get; set; }

    [Column("related_entity_type")]
    public string? RelatedEntityType { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    // Mapping methods...
}
```

#### Step 1.3: Create DTOs

Create `Stepper.Api/Notifications/DTOs/NotificationResponse.cs`:
```csharp
public record NotificationResponse(
    Guid Id,
    string Type,
    string Title,
    string Message,
    bool IsRead,
    Guid? RelatedEntityId,
    string? RelatedEntityType,
    DateTime CreatedAt
);
```

Create `Stepper.Api/Notifications/DTOs/NotificationListResponse.cs`:
```csharp
public record NotificationListResponse(
    List<NotificationResponse> Items,
    int TotalCount,
    int UnreadCount,
    bool HasMore
);
```

Create `Stepper.Api/Notifications/DTOs/UnreadCountResponse.cs`:
```csharp
public record UnreadCountResponse(int Count);
```

#### Step 1.4: Create Repository

Create `Stepper.Api/Notifications/INotificationRepository.cs`:
```csharp
public interface INotificationRepository
{
    Task<List<Notification>> GetAllAsync(Guid userId, int limit, int offset);
    Task<int> GetTotalCountAsync(Guid userId);
    Task<int> GetUnreadCountAsync(Guid userId);
    Task<Notification?> GetByIdAsync(Guid id);
    Task MarkAsReadAsync(Guid id);
    Task MarkAllAsReadAsync(Guid userId);
    Task DeleteAsync(Guid id);
    Task CreateAsync(Notification notification);
}
```

Create `Stepper.Api/Notifications/NotificationRepository.cs`:
- Implement all methods using Supabase client
- Query notifications table filtered by user_id
- Order by created_at descending

#### Step 1.5: Create Service

Create `Stepper.Api/Notifications/INotificationService.cs`:
```csharp
public interface INotificationService
{
    Task<NotificationListResponse> GetAllAsync(Guid userId, int limit = 20, int offset = 0);
    Task<UnreadCountResponse> GetUnreadCountAsync(Guid userId);
    Task MarkAsReadAsync(Guid userId, Guid notificationId);
    Task MarkAllAsReadAsync(Guid userId);
    Task DeleteAsync(Guid userId, Guid notificationId);
}
```

Create `Stepper.Api/Notifications/NotificationService.cs`:
- Validate notification belongs to user before operations
- Map to response DTOs
- Calculate pagination

#### Step 1.6: Create Controller

Create `Stepper.Api/Notifications/NotificationsController.cs`:
```csharp
[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    /// <summary>
    /// Get all notifications for current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<NotificationListResponse>>> GetAll(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0)

    /// <summary>
    /// Get unread notification count
    /// </summary>
    [HttpGet("unread/count")]
    public async Task<ActionResult<ApiResponse<UnreadCountResponse>>> GetUnreadCount()

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    [HttpPut("{id}/read")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAsRead(Guid id)

    /// <summary>
    /// Mark all notifications as read
    /// </summary>
    [HttpPut("read-all")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAllAsRead()

    /// <summary>
    /// Delete a notification
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
}
```

#### Step 1.7: Register Services

Add to `Program.cs`:
```csharp
services.AddScoped<INotificationService, NotificationService>();
services.AddScoped<INotificationRepository, NotificationRepository>();
```

### Phase 2: Mobile - Refactor notificationsApi.ts

Replace all Supabase calls with HTTP client calls:

| Current Function | New Implementation |
|------------------|-------------------|
| `getNotifications(params)` | `GET /api/v1/notifications?limit=...&offset=...` |
| `getUnreadCount()` | `GET /api/v1/notifications/unread/count` |
| `markAsRead(id)` | `PUT /api/v1/notifications/{id}/read` |
| `markAllAsRead()` | `PUT /api/v1/notifications/read-all` |
| `deleteNotification(id)` | `DELETE /api/v1/notifications/{id}` |

```typescript
import { apiClient } from './client';
import type {
  NotificationList,
  Notification,
  UnreadCount
} from '../../types/notifications';

export const notificationsApi = {
  getNotifications: async (params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<NotificationList> => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    const endpoint = query ? `/notifications?${query}` : '/notifications';

    return apiClient.get<NotificationList>(endpoint);
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<UnreadCount>('/notifications/unread/count');
    return response.count;
  },

  markAsRead: async (id: string): Promise<void> => {
    return apiClient.put<void>(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    return apiClient.put<void>('/notifications/read-all');
  },

  deleteNotification: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/notifications/${id}`);
  },
};
```

## Dependencies

### New Packages Required

**None**

## Database Changes

**Verify table exists**: `notifications` table should already exist. If not, create migration:

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_id UUID,
    related_entity_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying user's notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- RLS Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());
```

## Tests

### Backend Unit Tests
- `Stepper.Api.Tests/Notifications/NotificationServiceTests.cs`
  - Test get all notifications
  - Test unread count
  - Test mark as read
  - Test mark all as read
  - Test delete
  - Test authorization (can't access others' notifications)

### Backend Integration Tests
- `Stepper.Api.Tests/Notifications/NotificationsControllerTests.cs`
  - Test all endpoints
  - Test pagination
  - Test authorization

### Mobile Tests
- Update `Stepper.Mobile/src/services/api/__tests__/notificationsApi.test.ts`
- Mock `apiClient` instead of Supabase

## Acceptance Criteria

### Backend
- [ ] Notifications feature slice is complete (controller, service, repository)
- [ ] `GET /api/v1/notifications` returns paginated notifications
- [ ] `GET /api/v1/notifications/unread/count` returns unread count
- [ ] `PUT /api/v1/notifications/{id}/read` marks as read
- [ ] `PUT /api/v1/notifications/read-all` marks all as read
- [ ] `DELETE /api/v1/notifications/{id}` deletes notification
- [ ] Users can only access their own notifications
- [ ] All endpoints have XML documentation

### Mobile
- [ ] `notificationsApi.ts` makes zero direct Supabase data calls
- [ ] All 5 functions work correctly
- [ ] Response types match expected format
- [ ] All existing functionality works as before
- [ ] Updated tests pass

## Risks & Open Questions

### Risks
1. **Database table may not exist**: Need to verify or create migration
   - Mitigation: Check database schema first

2. **Notification creation**: Who creates notifications?
   - Note: This plan focuses on reading/managing. Notification creation may be via database triggers or need separate implementation in other features.

### Open Questions
- None

## Agent Assignment

| Phase | Agent | Notes |
|-------|-------|-------|
| DB Check | Database Engineer | Verify/create notifications table |
| 1 | Backend Engineer | Create Notifications feature slice |
| 2 | Frontend Engineer | API refactoring |
| Tests | Tester | Write and verify tests |

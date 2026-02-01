# Plan: Download My Data (GDPR Data Portability)

## Summary

This plan implements a "Download My Data" feature for GDPR compliance (Article 20 - Right to Data Portability). Users can request a complete export of their personal data from the Settings screen. The backend compiles all user data from multiple tables into a structured JSON file, which is returned synchronously and delivered to the user via the native share sheet on mobile. The implementation follows a synchronous approach suitable for the current data volume, with consideration for future async processing if data sizes grow significantly.

## Affected Feature Slices

- **Users**: New endpoint, service method, repository methods for data export
- **Common**: Shared DTOs for export response
- **Mobile/Settings**: New UI component for triggering export and handling file download

## Goals

1. Allow users to export all their personal data in a portable JSON format
2. Ensure GDPR Article 20 compliance for data portability
3. Deliver exported data via native share sheet (iOS/Android)
4. Secure the endpoint to only allow users to export their own data
5. Include all user data tables in the export

## Non-Goals

- Async/background processing with email delivery (may be future enhancement)
- PDF or other format exports (JSON is GDPR standard)
- Scheduled automatic exports
- Admin ability to export user data (separate admin feature if needed)
- Data deletion (separate GDPR requirement - "Right to Erasure")

## Architecture Overview

```
+------------------------------------------------------------------+
|                    Settings Screen (Mobile)                       |
|  - "Download My Data" list item                                  |
|  - Confirmation modal with data summary                          |
|  - Loading state during export                                   |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                    usersApi.downloadMyData()                      |
|  - GET /api/v1/users/me/data-export                              |
|  - Returns UserDataExportResponse                                |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                    UsersController                                |
|  - DataExport endpoint (GET /me/data-export)                     |
|  - Returns ApiResponse<UserDataExportResponse>                   |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                    UserService                                    |
|  - CompileUserDataExportAsync(userId)                            |
|  - Orchestrates data collection from all repositories            |
+------------------------------------------------------------------+
          |            |            |            |
          v            v            v            v
+----------+    +----------+    +----------+    +----------+
| UserRepo |    | StepRepo |    |FriendRepo|    | GroupRepo|
|          |    |          |    |          |    |          |
+----------+    +----------+    +----------+    +----------+
          |            |            |            |
          +------------+------------+------------+
                              |
                              v
+------------------------------------------------------------------+
|                    Supabase (PostgreSQL + RLS)                    |
|  - RLS ensures user can only access their own data               |
+------------------------------------------------------------------+
```

## Data Export Structure

The export will be a JSON object containing all user data organized by category:

```json
{
  "exportMetadata": {
    "exportedAt": "2026-02-01T12:00:00Z",
    "userId": "uuid",
    "dataFormat": "stepper_export_v1"
  },
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": "https://...",
    "qrCodeId": "abc123",
    "onboardingCompleted": true,
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "preferences": {
    "dailyStepGoal": 10000,
    "units": "metric",
    "notificationsEnabled": true,
    "notificationDailyReminder": true,
    "notificationFriendRequests": true,
    "notificationGroupInvites": true,
    "notificationAchievements": true,
    "privacyProfileVisibility": "public",
    "privacyFindMe": "public",
    "privacyShowSteps": "partial"
  },
  "stepHistory": [
    {
      "date": "2026-01-31",
      "stepCount": 8500,
      "distanceMeters": 6800.5,
      "source": "healthkit",
      "recordedAt": "2026-01-31T23:00:00Z",
      "syncedAt": "2026-01-31T23:05:00Z"
    }
  ],
  "friendships": [
    {
      "friendId": "uuid",
      "friendDisplayName": "Jane Smith",
      "status": "accepted",
      "initiatedByMe": true,
      "createdAt": "2025-06-01T00:00:00Z"
    }
  ],
  "groupMemberships": [
    {
      "groupId": "uuid",
      "groupName": "Weekend Warriors",
      "role": "member",
      "joinedAt": "2025-07-01T00:00:00Z"
    }
  ],
  "activityFeed": [
    {
      "id": "uuid",
      "type": "friend_request_accepted",
      "content": "Jane Smith accepted your friend request",
      "createdAt": "2025-06-01T00:00:00Z",
      "read": true
    }
  ],
  "notifications": [
    {
      "id": "uuid",
      "type": "daily_reminder",
      "title": "Daily Reminder",
      "body": "Don't forget to log your steps!",
      "createdAt": "2026-01-31T18:00:00Z",
      "readAt": "2026-01-31T18:05:00Z"
    }
  ]
}
```

## Proposed Types

### Backend (C#)

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `UserDataExportResponse` | Users/DTOs/UserDataExportResponse.cs | Main export response DTO |
| `ExportMetadata` | Users/DTOs/UserDataExportResponse.cs | Export metadata (timestamp, version) |
| `ExportedProfile` | Users/DTOs/UserDataExportResponse.cs | User profile data |
| `ExportedPreferences` | Users/DTOs/UserDataExportResponse.cs | User preferences |
| `ExportedStepEntry` | Users/DTOs/UserDataExportResponse.cs | Step entry for export |
| `ExportedFriendship` | Users/DTOs/UserDataExportResponse.cs | Friendship data |
| `ExportedGroupMembership` | Users/DTOs/UserDataExportResponse.cs | Group membership data |
| `ExportedActivityItem` | Users/DTOs/UserDataExportResponse.cs | Activity feed item |
| `ExportedNotification` | Users/DTOs/UserDataExportResponse.cs | Notification data |

### Frontend (TypeScript)

| Type Name | Location | Responsibility |
|-----------|----------|----------------|
| `UserDataExport` | services/api/usersApi.ts | Main export data type |
| `DataExportModal` | screens/settings/components/DataExportModal.tsx | Confirmation/progress UI |

## Implementation Steps

### Phase 1: Backend - Data Export Service

1. **Create export DTOs** (`Users/DTOs/UserDataExportResponse.cs`)
   - Define all nested record types for export sections
   - Use records for immutability
   - Include XML documentation

2. **Add repository methods for data retrieval**
   - `IUserRepository.GetUserWithEmailAsync()` - Get user profile with email
   - `IUserPreferencesRepository.GetPreferencesAsync()` - Already exists
   - `IStepRepository.GetAllStepEntriesAsync()` - Get all step entries for user
   - `IFriendRepository.GetAllFriendshipsAsync()` - Get all friendships
   - `IGroupRepository.GetUserMembershipsWithGroupsAsync()` - Get memberships with group names
   - `IActivityRepository.GetAllActivityItemsAsync()` - Get all activity items
   - `INotificationRepository.GetAllNotificationsAsync()` - Get all notifications

3. **Add service method** (`IUserService.ExportUserDataAsync`)
   - Orchestrate calls to all repositories
   - Compile data into export response
   - Add export metadata

4. **Add controller endpoint** (`UsersController`)
   - `GET /api/v1/users/me/data-export`
   - Authorize attribute ensures authentication
   - Return JSON response

### Phase 2: Backend - Repository Implementations

5. **Implement UserRepository additions**
   - Method to fetch user email from Supabase auth

6. **Implement StepRepository.GetAllStepEntriesAsync**
   - Return all step entries ordered by date

7. **Implement FriendRepository.GetAllFriendshipsAsync**
   - Include friend display names
   - Indicate if user initiated the friendship

8. **Implement GroupRepository.GetUserMembershipsWithGroupsAsync**
   - Join with groups table for group names
   - Include role information

9. **Implement ActivityRepository.GetAllActivityItemsAsync**
   - Return all activity items for user

10. **Implement NotificationRepository.GetAllNotificationsAsync**
    - Return all notifications for user

### Phase 3: Frontend - API Integration

11. **Add API method** (`usersApi.downloadMyData`)
    - Call export endpoint
    - Return typed response

12. **Add types for export data**
    - Define TypeScript interfaces matching backend DTOs

### Phase 4: Frontend - UI Components

13. **Create DataExportModal component**
    - Informational text about what data will be exported
    - "Export" and "Cancel" buttons
    - Loading state with progress indicator
    - Error handling with retry option

14. **Update SettingsScreen**
    - Add "Download My Data" list item in Privacy section
    - Wire up modal visibility state
    - Implement export handler with share sheet

15. **Implement file sharing**
    - Use `expo-sharing` or `expo-file-system` with sharing
    - Convert JSON to file and trigger share sheet
    - Handle platform-specific behaviors

### Phase 5: Testing

16. **Backend unit tests**
    - Test service method compiles data correctly
    - Test all repository methods return expected data
    - Test controller returns proper response format

17. **Backend integration tests**
    - Test full endpoint with authenticated user
    - Verify RLS prevents accessing other users' data

18. **Frontend unit tests**
    - Test DataExportModal renders correctly
    - Test loading and error states
    - Test settings screen includes new option

19. **Manual testing**
    - Test on iOS simulator
    - Test on Android emulator
    - Verify share sheet works correctly
    - Verify JSON contains all expected data

## Dependencies

### New Packages Required

| Package | Platform | Justification |
|---------|----------|---------------|
| `expo-sharing` | Mobile | Share files via native share sheet |
| `expo-file-system` | Mobile | Write JSON to temp file for sharing |

Note: These packages may already be installed. Verify before adding.

### No Backend Package Changes

All required functionality uses existing Supabase client and .NET framework.

## Database Changes

No schema changes required. All data is read from existing tables:
- `users`
- `user_preferences`
- `step_entries`
- `friendships`
- `group_memberships`
- `groups` (for join)
- `activity_feed`
- `notifications`

## Security Considerations

1. **Authentication Required**: Endpoint requires valid JWT token
2. **RLS Enforcement**: Supabase RLS policies ensure users can only read their own data
3. **No Cross-User Access**: Service uses authenticated user ID from token claims
4. **Email Retrieval**: Email must be fetched from Supabase Auth, not stored in users table
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse (future enhancement)
6. **Logging**: Log export requests for audit trail (without logging the data content)

## Performance Considerations

1. **Data Volume**: For typical users, export should complete in < 5 seconds
2. **Parallel Queries**: Repository calls can be parallelized with `Task.WhenAll`
3. **Memory**: Entire export is held in memory; acceptable for current data sizes
4. **Future Scaling**: If data grows significantly, consider:
   - Async processing with email delivery
   - Streaming JSON generation
   - Pagination for large datasets

## Tests

### Unit Tests

| Test | Location | Description |
|------|----------|-------------|
| `ExportUserDataAsync_ReturnsAllData` | UserServiceTests | Verify all sections populated |
| `ExportUserDataAsync_SetsCorrectMetadata` | UserServiceTests | Verify export timestamp and version |
| `GetAllStepEntriesAsync_ReturnsOrderedData` | StepRepositoryTests | Verify chronological order |
| `GetAllFriendshipsAsync_IncludesDisplayNames` | FriendRepositoryTests | Verify friend names included |
| `DataExportModal_ShowsLoadingState` | DataExportModal.test.tsx | Verify loading UI |
| `DataExportModal_HandlesError` | DataExportModal.test.tsx | Verify error display |
| `SettingsScreen_ShowsDataExportOption` | SettingsScreen.test.tsx | Verify menu item exists |

### Integration Tests

| Test | Description |
|------|-------------|
| `DataExport_RequiresAuthentication` | Verify 401 without token |
| `DataExport_ReturnsUserData` | Verify full export for test user |
| `DataExport_EnforcesRLS` | Verify cannot access other user data |

## Acceptance Criteria

### Backend
- [ ] `GET /api/v1/users/me/data-export` endpoint exists and requires authentication
- [ ] Response includes all sections: profile, preferences, stepHistory, friendships, groupMemberships, activityFeed, notifications
- [ ] Export metadata includes timestamp and format version
- [ ] User email is included in profile section
- [ ] RLS prevents access to other users' data
- [ ] Response time < 10 seconds for users with typical data volume

### Frontend
- [ ] "Download My Data" option appears in Settings > Privacy section
- [ ] Tapping shows confirmation modal explaining the export
- [ ] "Export" button triggers data fetch with loading indicator
- [ ] On success, native share sheet opens with JSON file
- [ ] User can share/save file via share sheet options
- [ ] Error states are handled gracefully with retry option
- [ ] Analytics event tracked: `data_export_requested`

### GDPR Compliance
- [ ] Export contains all personal data stored about the user
- [ ] Data is in machine-readable format (JSON)
- [ ] Export is available within reasonable time (< 30 days per GDPR, we deliver immediately)
- [ ] No other user's data is included in export

## Risks and Open Questions

### Risks

1. **Large Data Exports**: Users with years of step data may have large exports
   - Mitigation: Monitor response times; implement async processing if needed

2. **Memory Pressure**: Large exports held in memory
   - Mitigation: Monitor memory usage; consider streaming for future

3. **Rate Limiting Abuse**: Users could spam export endpoint
   - Mitigation: Add rate limiting (e.g., 1 export per hour) in future iteration

### Open Questions

1. **Email Inclusion**: Should we fetch the email from Supabase Auth or rely on it being synced to users table?
   - **Recommendation**: Fetch from Supabase Auth to ensure we have the current email, even if it was changed after account creation.

2. **Step Entry Limit**: Should we limit historical step entries (e.g., last 2 years)?
   - **Recommendation**: No limit for GDPR compliance; user has right to all their data.

3. **Notification History**: How far back should we include notifications?
   - **Recommendation**: Include all; let user decide what to keep.

4. **Analytics Event**: Should we track data exports?
   - **Recommendation**: Yes, track `data_export_requested` event for usage analytics (with user consent).

## Decisions

1. **Synchronous vs Async**: Use synchronous delivery via API response. The expected data volumes are manageable, and immediate delivery provides better UX. Async with email can be added later if needed.

2. **File Format**: JSON only. This is the standard format for GDPR data portability and is machine-readable.

3. **Delivery Mechanism**: Use native share sheet via `expo-sharing`. This allows users to save to Files, email to themselves, or use any sharing option available on their device.

4. **Export Version**: Include `dataFormat: "stepper_export_v1"` for future compatibility if export structure changes.

## Agent Assignment

| Phase | Agent | Estimated Effort |
|-------|-------|------------------|
| Phase 1-2 | Backend Engineer | 1 day |
| Phase 3-4 | Frontend Engineer | 1 day |
| Phase 5 | Tester | 0.5 day |
| Review | Reviewer | 0.5 day |

**Total Estimated Effort**: 3 days

# Frontend Modifications Required

**Feature**: Download My Data (GDPR Data Portability)
**Date**: 2026-02-01
**Requested by**: Backend Engineer Agent

## API Contract

### New Endpoint

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/users/me/data-export` | GET | Export all user data for GDPR compliance |

### Response Shape

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  errors: string[];
}

interface UserDataExportResponse {
  exportMetadata: ExportMetadata;
  profile: ExportedProfile;
  preferences: ExportedPreferences;
  stepHistory: ExportedStepEntry[];
  friendships: ExportedFriendship[];
  groupMemberships: ExportedGroupMembership[];
  activityFeed: ExportedActivityItem[];
  notifications: ExportedNotification[];
}

interface ExportMetadata {
  exportedAt: string; // ISO 8601 datetime
  userId: string; // UUID
  dataFormat: string; // "stepper_export_v1"
}

interface ExportedProfile {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  qrCodeId: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

interface ExportedPreferences {
  dailyStepGoal: number;
  units: string;
  notificationsEnabled: boolean;
  notifyDailyReminder: boolean;
  notifyFriendRequests: boolean;
  notifyGroupInvites: boolean;
  notifyAchievements: boolean;
  privacyProfileVisibility: string;
  privacyFindMe: string;
  privacyShowSteps: string;
}

interface ExportedStepEntry {
  date: string; // YYYY-MM-DD format
  stepCount: number;
  distanceMeters: number | null;
  source: string | null;
  recordedAt: string;
}

interface ExportedFriendship {
  friendId: string;
  friendDisplayName: string;
  status: string; // "accepted", "pending", "rejected"
  initiatedByMe: boolean;
  createdAt: string;
}

interface ExportedGroupMembership {
  groupId: string;
  groupName: string;
  role: string; // "owner", "admin", "member"
  joinedAt: string;
}

interface ExportedActivityItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

interface ExportedNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}
```

## Frontend Implementation Requirements

### 1. Add API Method

Add to `services/api/usersApi.ts`:

```typescript
export async function downloadMyData(): Promise<UserDataExportResponse> {
  const response = await apiClient.get<ApiResponse<UserDataExportResponse>>(
    '/api/v1/users/me/data-export'
  );
  if (!response.data.success) {
    throw new Error(response.data.errors.join(', '));
  }
  return response.data.data!;
}
```

### 2. Settings Screen Update

Add "Download My Data" option in Settings > Privacy section:
- List item with download icon
- Tapping shows confirmation modal
- Loading state during export
- Error handling with retry option

### 3. Data Export Modal

Create `DataExportModal.tsx`:
- Informational text explaining what data will be exported
- "Export" and "Cancel" buttons
- Loading indicator during export
- Error state with retry option

### 4. File Sharing

After successful export:
1. Convert JSON response to string
2. Write to temp file using `expo-file-system`
3. Trigger native share sheet using `expo-sharing`
4. File name: `stepper-data-export-YYYY-MM-DD.json`

### Required Packages

Check if these are already installed:
- `expo-sharing`
- `expo-file-system`

### Analytics Event

Track: `data_export_requested` when user initiates export

## Notes for Frontend Engineer

- The endpoint requires authentication (JWT token)
- Response can be large for users with extensive history
- Recommend showing loading indicator during export
- JSON is the standard format for GDPR data portability
- Step history is aggregated by day (summaries)
- Email may be null if not available from Supabase Auth

---
Handoff to: **Frontend Engineer Agent**

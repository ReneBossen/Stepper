## Frontend Modifications Required

**Feature**: Data Export Timeout Fix
**Date**: 2026-02-01
**Requested by**: Backend Engineer Agent

### Issue

The "JSON Parse error: Unexpected end of input" error is likely caused by the data export request timing out. The current default timeout is 30 seconds, which may not be sufficient for users with large amounts of data (extensive step history, many friendships, groups, and notifications).

### Recommended Changes

| File | Change | Description |
|------|--------|-------------|
| `Stepper.Mobile/src/services/api/usersApi.ts` | Increase timeout for `downloadMyData` | Pass a longer timeout option for the export endpoint |
| `Stepper.Mobile/src/config/api.ts` | Add export timeout constant (optional) | Define a specific timeout for heavy operations |

### Implementation Details

**Option 1: Pass custom timeout to the API call**

```typescript
// In usersApi.ts
downloadMyData: async (): Promise<UserDataExport> => {
  return apiClient.get<UserDataExport>('/users/me/data-export', {
    timeout: 120000, // 2 minutes for large data exports
  });
},
```

**Option 2: Add constant for heavy operations**

```typescript
// In api.ts
export const API_CONFIG = {
  // ... existing config
  TIMEOUT: 30000,
  HEAVY_OPERATION_TIMEOUT: 120000, // 2 minutes
};

// In usersApi.ts
downloadMyData: async (): Promise<UserDataExport> => {
  return apiClient.get<UserDataExport>('/users/me/data-export', {
    timeout: API_CONFIG.HEAVY_OPERATION_TIMEOUT,
  });
},
```

### Backend Changes Already Made

The backend has been updated with:
1. Better error handling with descriptive messages
2. Null safety checks on all exported fields
3. Named constants for max limits (10000 items)
4. Explicit JSON serialization configuration with camelCase

### Testing

After the frontend change, test with:
1. A user with minimal data (should complete quickly)
2. A user with extensive step history (multiple months)
3. A user with many friendships and group memberships

---
Handoff to: **Frontend Engineer Agent**

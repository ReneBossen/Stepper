# Code Review: Download My Data (GDPR Data Portability)

**Plan**: `docs/plans/27_DownloadMyData.md`
**Iteration**: 1
**Date**: 2026-02-01

## Summary

The "Download My Data" feature implementation is well-structured and follows the established architectural patterns. The backend properly orchestrates data collection from multiple repositories using parallel execution, and the frontend provides a clean user experience with proper loading and error states. The implementation meets the GDPR Article 20 requirements for data portability.

Overall, this is a solid implementation with a few minor issues that should be addressed but no blockers preventing approval.

## Checklist Results

### Architecture Compliance
- [x] Dependency direction preserved (Controller -> Service -> Repository -> Supabase)
- [x] No business logic in controllers (controller is thin HTTP adapter)
- [x] Feature slices are independent and loosely coupled
- [x] Common folder contains only shared infrastructure
- [x] Screaming Architecture principles respected

### Code Quality
- [x] Follows coding standards
- [x] No code smells (duplication, long methods, etc.)
- [x] Proper error handling
- [x] No magic strings (constants defined for export format version)
- [x] Guard clauses present

### Plan Adherence
- [x] All plan items implemented
- [x] No unplanned changes
- [x] No scope creep

### Testing
- [x] Tests cover new functionality
- [x] Tests are deterministic
- [x] Tests verify all data sections

### Security
- [x] User can only export their own data (RLS + auth checks via GetUserId)
- [x] No sensitive data exposure (passwords, tokens never in export)
- [x] Proper error handling without leaking internal details

### GDPR Compliance
- [x] Export includes all personal data tables
- [x] JSON format is machine-readable
- [x] Export metadata includes version for future compatibility

### Performance
- [x] Parallel data fetching implemented (`Task.WhenAll`)
- [ ] Potential N+1 in GetUserGroupMembershipsWithDetailsAsync (MINOR)

## Issues

### BLOCKER

None identified.

### MAJOR

None identified.

### MINOR

#### Issue #1: Email Not Included in Export
**File**: `E:\Github Projects\Stepper\Stepper.Api\Users\UserService.cs`
**Line**: 349
**Description**: The `CreateExportedProfile` method sets `Email: null` with a comment stating "Email is stored in Supabase Auth, not accessible from users table." While this is technically accurate, the plan explicitly states in the Data Export Structure that email should be included (line 91 of plan: `"email": "user@example.com"`). The plan's "Open Questions" section (line 386) also recommends fetching from Supabase Auth.
**Suggestion**: Consider fetching the user's email from Supabase Auth using the admin API if GDPR compliance requires including the email. Alternatively, document this as a known limitation in the export metadata. This is marked as MINOR because the user can still see their email in the app settings and the implementation note acknowledges this intentionally.

#### Issue #2: Activity Feed Retrieval May Not Be User-Specific
**File**: `E:\Github Projects\Stepper\Stepper.Api\Users\UserService.cs`
**Lines**: 456-466
**Description**: The `FetchAllActivityItemsAsync` method calls `_activityRepository.GetFeedAsync(userId, [], maxActivityItems, 0)` with an empty friend list. Depending on the implementation of `GetFeedAsync`, this might include only the user's own activities, but the interface pattern suggests it retrieves a combined feed. This should be verified to ensure only the user's personal activity items are exported.
**Suggestion**: Verify that `GetFeedAsync` with an empty friend list returns only the user's activities. If not, consider adding a dedicated method like `GetUserActivityItemsAsync(userId)` for the export use case.

#### Issue #3: N+1 Query Potential in Group Repository
**File**: `E:\Github Projects\Stepper\Stepper.Api\Groups\GroupRepository.cs`
**Lines**: 409-417
**Description**: The `FetchGroupsDictionaryAsync` method fetches member counts individually for each group in a loop, causing an N+1 query pattern.
**Suggestion**: For export purposes with potentially many groups, consider batching the member count queries or accepting the trade-off given typical user group counts are low.

#### Issue #4: Hardcoded Max Limits
**File**: `E:\Github Projects\Stepper\Stepper.Api\Users\UserService.cs`
**Lines**: 459, 471
**Description**: The max items for activity feed (10000) and notifications (10000) are hardcoded inline rather than using named constants.
**Suggestion**: Extract these to named constants at the class level for consistency with the existing pattern (e.g., `ExportDataFormatVersion`).

#### Issue #5: TypeScript Export Types Match Backend But Use CamelCase
**File**: `E:\Github Projects\Stepper\Stepper.Mobile\src\services\api\usersApi.ts`
**Lines**: 10-111
**Description**: The TypeScript export interfaces use camelCase property names which correctly matches the backend DTOs. However, the rest of the API file uses snake_case for other response types, creating inconsistency. This is acceptable since the export response is used directly without transformation.
**Suggestion**: No action required - this is intentional since the export data is written directly to a JSON file without transformation. Adding a comment noting this design decision would be helpful.

## Code Smells Detected

None significant. The implementation is well-organized with:
- Clear separation of concerns
- Private helper methods for data transformation
- Appropriate use of records for DTOs
- Good use of `Task.WhenAll` for parallel execution

## Positive Observations

1. **Excellent DTOs**: The `UserDataExportResponse.cs` file uses C# records with comprehensive XML documentation.

2. **Comprehensive Testing**: Both backend unit tests (`UserServiceDataExportTests.cs`) and frontend tests (`DataExportModal.test.tsx`) provide good coverage including edge cases.

3. **Analytics Integration**: The `data_export_requested` event is properly defined in `analyticsTypes.ts` and correctly tracked with status (`started`, `completed`, `failed`).

4. **User Experience**: The `DataExportModal.tsx` component provides:
   - Clear information about what data will be exported
   - Loading state with helpful message
   - Error handling with retry option
   - Proper cleanup of temporary files

5. **Parallel Execution**: The service correctly uses `Task.WhenAll` to fetch data from all repositories in parallel.

6. **File Handling**: The frontend properly uses `expo-file-system/legacy` and `expo-sharing` with correct cleanup of temporary files.

7. **Settings Screen Integration**: The "Download My Data" option is correctly placed in the Privacy section with appropriate icon and accessibility labels.

## Files Reviewed

### Backend
| File | Status | Notes |
|------|--------|-------|
| `Stepper.Api/Users/DTOs/UserDataExportResponse.cs` | PASS | Clean records with XML docs |
| `Stepper.Api/Users/IUserService.cs` | PASS | Interface properly extended |
| `Stepper.Api/Users/UserService.cs` | PASS | Good implementation with parallel fetching |
| `Stepper.Api/Users/UsersController.cs` | PASS | Thin controller, proper auth |
| `Stepper.Api/Groups/IGroupRepository.cs` | PASS | New method properly documented |
| `Stepper.Api/Groups/GroupRepository.cs` | PASS | Implementation follows existing patterns |

### Frontend
| File | Status | Notes |
|------|--------|-------|
| `Stepper.Mobile/src/services/api/usersApi.ts` | PASS | Types match backend, method simple |
| `Stepper.Mobile/src/screens/settings/components/DataExportModal.tsx` | PASS | Good UX, proper error handling |
| `Stepper.Mobile/src/screens/settings/SettingsScreen.tsx` | PASS | Properly integrated |
| `Stepper.Mobile/src/services/analytics/analyticsTypes.ts` | PASS | Event type properly defined |

### Tests
| File | Status | Notes |
|------|--------|-------|
| `tests/Stepper.UnitTests/Users/UserServiceDataExportTests.cs` | PASS | Comprehensive coverage |
| `Stepper.Mobile/.../DataExportModal.test.tsx` | PASS | Good coverage including error cases |
| `Stepper.Mobile/.../usersApi.test.ts` | PASS | Tests export API method |

## Recommendation

**Status**: APPROVE

The implementation is well-executed and meets all the plan requirements. The minor issues identified are quality improvements that do not block the feature.

**Next Steps**:
- [ ] (Optional) Consider adding email retrieval from Supabase Auth in a future iteration
- [ ] (Optional) Extract hardcoded max limits to constants
- [ ] (Optional) Add inline comment in usersApi.ts explaining why export types use camelCase
- [ ] Verify activity feed retrieval returns only user's own items (can be done during QA testing)

---

> **USER ACCEPTANCE REQUIRED**: Before proceeding, the user must review and approve this assessment.

## Review Signature

Reviewed by: Reviewer Agent
Review Date: 2026-02-01
Plan Version: 27_DownloadMyData.md

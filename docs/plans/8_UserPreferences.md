# Plan 8: User Preferences

## Summary

This plan extends the existing Users feature to provide comprehensive user preferences management. Preferences include units (metric/imperial), daily step goal, notification settings, privacy settings, and theme preferences. The preferences are stored in the existing JSONB `preferences` column in the `users` table, with dedicated API endpoints for retrieval and updates.

## Affected Feature Slices

- **Users**: Extended with preferences management
- **Notifications**: Uses notification preferences
- **Friends/Discovery**: Uses privacy preferences for search visibility
- **Steps**: Uses units preference for display

## Proposed Types

| Type Name | Feature/Location | Responsibility |
|-----------|------------------|----------------|
| PreferencesController | Users/Preferences/ | HTTP endpoints for preferences |
| IPreferencesService | Users/Preferences/ | Interface for preferences business logic |
| PreferencesService | Users/Preferences/ | Preferences management logic |
| UserPreferences | Users/Preferences/ | Domain model for all preferences |
| UnitsPreference | Users/Preferences/ | Enum: Metric, Imperial |
| PrivacyLevel | Users/Preferences/ | Enum: Everyone, FriendsOfFriends, Nobody |
| ThemePreference | Users/Preferences/ | Enum: Light, Dark, System |
| NotificationPreferences | Users/Preferences/ | Notification settings model |
| PrivacyPreferences | Users/Preferences/ | Privacy settings model |

## Implementation Steps

1. **Define default preferences in database**:
   ```sql
   ALTER TABLE users
   ALTER COLUMN preferences
   SET DEFAULT '{
       "units": "metric",
       "daily_step_goal": 10000,
       "notifications": {
           "push_enabled": true,
           "friend_requests": true,
           "friend_accepted": true,
           "group_invites": true,
           "milestones": true
       },
       "privacy": {
           "find_me": "everyone",
           "show_steps": "everyone",
           "show_profile": "everyone"
       },
       "theme": "system"
   }'::jsonb;
   ```

2. **Create migration to populate existing users** with complete defaults

3. **Create validation function** for preferences:
   ```sql
   CREATE OR REPLACE FUNCTION validate_preferences(p_preferences JSONB)
   RETURNS BOOLEAN AS $$
   -- Validate units, step goal, privacy levels, theme
   $$;

   ALTER TABLE users ADD CONSTRAINT valid_preferences
       CHECK (validate_preferences(preferences));
   ```

4. **Create Users/Preferences folder structure**:
   ```
   WalkingApp.Api/Users/Preferences/
   ├── PreferencesController.cs
   ├── IPreferencesService.cs
   ├── PreferencesService.cs
   ├── UserPreferences.cs
   ├── NotificationPreferences.cs
   ├── PrivacyPreferences.cs
   └── DTOs/
   ```

5. **Define domain models**:
   ```csharp
   public class UserPreferences
   {
       public UnitsPreference Units { get; set; } = UnitsPreference.Metric;
       public int DailyStepGoal { get; set; } = 10000;
       public NotificationPreferences Notifications { get; set; } = new();
       public PrivacyPreferences Privacy { get; set; } = new();
       public ThemePreference Theme { get; set; } = ThemePreference.System;
   }

   public class NotificationPreferences
   {
       public bool PushEnabled { get; set; } = true;
       public bool FriendRequests { get; set; } = true;
       public bool FriendAccepted { get; set; } = true;
       public bool GroupInvites { get; set; } = true;
       public bool Milestones { get; set; } = true;
       public bool QuietHoursEnabled { get; set; } = false;
       public TimeOnly? QuietHoursStart { get; set; }
       public TimeOnly? QuietHoursEnd { get; set; }
   }

   public class PrivacyPreferences
   {
       public PrivacyLevel FindMe { get; set; } = PrivacyLevel.Everyone;
       public PrivacyLevel ShowSteps { get; set; } = PrivacyLevel.Everyone;
       public PrivacyLevel ShowProfile { get; set; } = PrivacyLevel.Everyone;
   }
   ```

6. **Implement PreferencesService**:
   - `GetPreferencesAsync()` - Get user preferences
   - `UpdatePreferencesAsync()` - Update all preferences
   - `UpdateUnitsAsync()` - Update units only
   - `UpdateStepGoalAsync()` - Update step goal
   - `UpdateNotificationPreferencesAsync()` - Update notification prefs
   - `UpdatePrivacyPreferencesAsync()` - Update privacy prefs
   - `UpdateThemeAsync()` - Update theme
   - `ResetToDefaultsAsync()` - Reset to defaults

7. **Implement PreferencesController endpoints**:
   - `GET /api/users/me/preferences` - Get all preferences
   - `PUT /api/users/me/preferences` - Update all preferences
   - `PATCH /api/users/me/preferences/units` - Update units only
   - `PATCH /api/users/me/preferences/step-goal` - Update step goal
   - `PATCH /api/users/me/preferences/notifications` - Update notifications
   - `PATCH /api/users/me/preferences/privacy` - Update privacy
   - `PATCH /api/users/me/preferences/theme` - Update theme
   - `POST /api/users/me/preferences/reset` - Reset to defaults

8. **Extend UserRepository** to handle JSONB partial updates

9. **Update Friend Discovery (Plan 6)** to check privacy preferences for search visibility

10. **Update Notification Service (Plan 7)** to check notification preferences before sending

11. **Create unit conversion utility**:
    ```csharp
    public static class UnitConverter
    {
        public static double MetersToMiles(double meters) => meters * 0.000621371;
        public static double MetersToKilometers(double meters) => meters / 1000;
        public static double ConvertDistance(double meters, UnitsPreference units)
    }
    ```

12. **Register services** in Program.cs

## Dependencies

No additional NuGet packages required - using built-in JSON support.

### Plan Dependencies
- Plan 1 (Supabase Integration) must be completed
- Plan 2 (Users) must be completed (preferences column exists)

## Database Changes

**Modified Column**: `users.preferences`
- Set comprehensive default value
- Add validation constraint

**Preferences JSONB Schema**:
```json
{
  "units": "metric | imperial",
  "daily_step_goal": 10000,
  "notifications": {
    "push_enabled": true,
    "friend_requests": true,
    "friend_accepted": true,
    "group_invites": true,
    "milestones": true,
    "quiet_hours_enabled": false,
    "quiet_hours_start": "HH:mm | null",
    "quiet_hours_end": "HH:mm | null"
  },
  "privacy": {
    "find_me": "everyone | friends_of_friends | nobody",
    "show_steps": "everyone | friends_of_friends | nobody",
    "show_profile": "everyone | friends_of_friends | nobody"
  },
  "theme": "light | dark | system"
}
```

## Tests

**Unit Tests**:
- Get preferences returns defaults for new user
- Update preferences validates values
- Update step goal validates range (1000-100000)
- Notification preferences merge correctly
- Privacy preferences merge correctly
- Reset restores all defaults

**Integration Tests**:
- GET /preferences returns complete preferences object
- PUT /preferences updates all preferences
- PATCH endpoints update specific sections
- Validation prevents invalid values

## Acceptance Criteria

- [ ] Default preferences are defined and documented
- [ ] New users receive default preferences automatically
- [ ] GET /preferences returns complete preferences object
- [ ] PUT /preferences updates all preferences
- [ ] PATCH endpoints update specific sections
- [ ] Units preference (metric/imperial) is validated
- [ ] Daily step goal validates range (1000-100000)
- [ ] Notification preferences control which notifications are sent
- [ ] Privacy settings control search visibility
- [ ] Theme preference is stored and returned
- [ ] Reset to defaults works correctly

## Risks and Open Questions

| Risk/Question | Mitigation/Answer |
|--------------|-------------------|
| JSONB schema evolution | Use additive changes, provide defaults |
| Validation at DB vs App level | Both - DB constraint for safety, app for UX |
| Privacy setting enforcement | Enforce in RLS policies and application code |
| Default preference changes | Version defaults, migrate existing users |
| Quiet hours timezone handling | Store as local time, document behavior |

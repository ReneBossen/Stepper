namespace WalkingApp.Api.Users.DTOs;

public class UserPreferences
{
    public string Units { get; set; } = "metric";
    public NotificationSettings Notifications { get; set; } = new();
    public PrivacySettings Privacy { get; set; } = new();
}

public class NotificationSettings
{
    public bool DailyReminder { get; set; } = true;
    public bool FriendRequests { get; set; } = true;
    public bool GroupInvites { get; set; } = true;
    public bool Achievements { get; set; } = true;
}

public class PrivacySettings
{
    public bool ShowStepsToFriends { get; set; } = true;
    public bool ShowGroupActivity { get; set; } = true;
    public bool AllowFriendRequests { get; set; } = true;
}

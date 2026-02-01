using Stepper.Api.Activity;
using Stepper.Api.Common.Database;
using Stepper.Api.Friends;
using Stepper.Api.Groups;
using Stepper.Api.Notifications;
using Stepper.Api.Steps;
using Stepper.Api.Users.DTOs;
using Supabase.Postgrest.Exceptions;

namespace Stepper.Api.Users;

/// <summary>
/// Service implementation for user business logic.
/// </summary>
public class UserService : IUserService
{
    private const string DefaultDisplayNamePrefix = "User_";
    private const int DefaultDisplayNameMaxLength = 20;
    private const int MinDailyStepGoal = 100;
    private const int MaxDailyStepGoal = 100000;
    private const long MaxAvatarFileSizeBytes = 5 * 1024 * 1024; // 5MB
    private const string AvatarsBucketName = "avatars";
    private const string ExportDataFormatVersion = "stepper_export_v1";
    private const int MaxExportActivityItems = 10000;
    private const int MaxExportNotifications = 10000;

    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp"
    };

    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp"
    };

    private static readonly HashSet<string> ValidDistanceUnits = new(StringComparer.OrdinalIgnoreCase)
    {
        "metric",
        "imperial"
    };

    private readonly IUserRepository _userRepository;
    private readonly IUserPreferencesRepository _preferencesRepository;
    private readonly IStepRepository _stepRepository;
    private readonly IFriendRepository _friendRepository;
    private readonly IGroupRepository _groupRepository;
    private readonly IActivityRepository _activityRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserService(
        IUserRepository userRepository,
        IUserPreferencesRepository preferencesRepository,
        IStepRepository stepRepository,
        IFriendRepository friendRepository,
        IGroupRepository groupRepository,
        IActivityRepository activityRepository,
        INotificationRepository notificationRepository,
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(userRepository);
        ArgumentNullException.ThrowIfNull(preferencesRepository);
        ArgumentNullException.ThrowIfNull(stepRepository);
        ArgumentNullException.ThrowIfNull(friendRepository);
        ArgumentNullException.ThrowIfNull(groupRepository);
        ArgumentNullException.ThrowIfNull(activityRepository);
        ArgumentNullException.ThrowIfNull(notificationRepository);
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _userRepository = userRepository;
        _preferencesRepository = preferencesRepository;
        _stepRepository = stepRepository;
        _friendRepository = friendRepository;
        _groupRepository = groupRepository;
        _activityRepository = activityRepository;
        _notificationRepository = notificationRepository;
        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public async Task<GetProfileResponse> GetProfileAsync(Guid userId)
    {
        ValidateUserId(userId);

        var user = await _userRepository.GetByIdAsync(userId);

        if (user == null)
        {
            throw new KeyNotFoundException($"User profile not found for user ID: {userId}");
        }

        return MapToGetProfileResponse(user);
    }

    /// <inheritdoc />
    public async Task<GetProfileResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        ValidateUserId(userId);
        ArgumentNullException.ThrowIfNull(request);

        var existingUser = await _userRepository.GetByIdAsync(userId);

        if (existingUser == null)
        {
            throw new KeyNotFoundException($"User profile not found for user ID: {userId}");
        }

        ApplyProfileUpdates(existingUser, request);

        // Note: UpdatedAt is automatically set by the database trigger (update_users_updated_at)
        var updatedUser = await _userRepository.UpdateAsync(existingUser);

        return MapToGetProfileResponse(updatedUser);
    }

    /// <inheritdoc />
    public async Task<GetProfileResponse> EnsureProfileExistsAsync(Guid userId)
    {
        ValidateUserId(userId);

        // First try to get existing user
        var existingUser = await _userRepository.GetByIdAsync(userId);

        if (existingUser != null)
        {
            await EnsureUserPreferencesExistAsync(userId);
            return MapToGetProfileResponse(existingUser);
        }

        // User doesn't exist, create new one
        var newUser = CreateDefaultUser(userId);

        try
        {
            var createdUser = await _userRepository.CreateAsync(newUser);
            await _preferencesRepository.CreateAsync(userId);
            return MapToGetProfileResponse(createdUser);
        }
        catch (PostgrestException ex) when (ex.Message.Contains("23505") || ex.Message.Contains("duplicate key"))
        {
            // Race condition: user was created between our check and insert
            // Fetch the existing user
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new InvalidOperationException($"Failed to create or retrieve user profile for user ID: {userId}", ex);
            }

            await EnsureUserPreferencesExistAsync(userId);
            return MapToGetProfileResponse(user);
        }
    }

    /// <inheritdoc />
    public async Task<UserPreferencesResponse> GetPreferencesAsync(Guid userId)
    {
        ValidateUserId(userId);

        // Ensure user profile exists (handles race condition with parallel /users/me call)
        await EnsureProfileExistsAsync(userId);

        var preferences = await _preferencesRepository.GetByUserIdAsync(userId);

        if (preferences == null)
        {
            // Create default preferences if not found
            preferences = await _preferencesRepository.CreateAsync(userId);
        }

        return MapToPreferencesResponse(preferences);
    }

    /// <inheritdoc />
    public async Task<UserPreferencesResponse> UpdatePreferencesAsync(Guid userId, UpdateUserPreferencesRequest request)
    {
        ValidateUserId(userId);
        ArgumentNullException.ThrowIfNull(request);
        ValidateUpdatePreferencesRequest(request);

        // Verify user exists
        await GetUserOrThrowAsync(userId);

        var preferences = await _preferencesRepository.GetByUserIdAsync(userId);

        if (preferences == null)
        {
            // Create default preferences if not found
            preferences = await _preferencesRepository.CreateAsync(userId);
        }

        ApplyPreferencesUpdate(preferences, request);
        var updated = await _preferencesRepository.UpdateAsync(preferences);

        return MapToPreferencesResponse(updated);
    }

    /// <inheritdoc />
    public async Task<AvatarUploadResponse> UploadAvatarAsync(Guid userId, Stream fileStream, string fileName, string contentType)
    {
        ValidateUserId(userId);
        ValidateAvatarFile(fileStream, fileName, contentType);

        var user = await GetUserOrThrowAsync(userId);
        var avatarUrl = await UploadAvatarToStorageAsync(userId, fileStream, fileName, contentType);

        user.AvatarUrl = avatarUrl;
        await _userRepository.UpdateAsync(user);

        return new AvatarUploadResponse(avatarUrl);
    }

    /// <inheritdoc />
    public async Task<UserStatsResponse> GetUserStatsAsync(Guid userId)
    {
        ValidateUserId(userId);

        var friendsCount = await _userRepository.GetFriendsCountAsync(userId);
        var groupsCount = await _userRepository.GetGroupsCountAsync(userId);

        return new UserStatsResponse
        {
            FriendsCount = friendsCount,
            GroupsCount = groupsCount,
            BadgesCount = 0 // Badges not implemented yet
        };
    }

    /// <inheritdoc />
    public async Task<UserActivityResponse> GetUserActivityAsync(Guid userId)
    {
        ValidateUserId(userId);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekAgo = today.AddDays(-6); // Last 7 days including today

        var stepEntries = await _userRepository.GetStepEntriesForRangeAsync(userId, weekAgo, today);

        var totalSteps = CalculateTotalSteps(stepEntries);
        var totalDistance = CalculateTotalDistance(stepEntries);
        var averageSteps = CalculateAverageSteps(totalSteps);
        var currentStreak = await CalculateCurrentStreakAsync(userId);

        return new UserActivityResponse
        {
            TotalSteps = totalSteps,
            TotalDistanceMeters = totalDistance,
            AverageStepsPerDay = averageSteps,
            CurrentStreak = currentStreak
        };
    }

    /// <inheritdoc />
    public async Task<List<MutualGroupResponse>> GetMutualGroupsAsync(Guid currentUserId, Guid otherUserId)
    {
        ValidateUserId(currentUserId);
        ValidateOtherUserId(otherUserId);

        var currentUserGroups = await _userRepository.GetUserGroupIdsAsync(currentUserId);
        var otherUserGroups = await _userRepository.GetUserGroupIdsAsync(otherUserId);

        var mutualGroupIds = currentUserGroups.Intersect(otherUserGroups).ToList();

        if (mutualGroupIds.Count == 0)
        {
            return new List<MutualGroupResponse>();
        }

        var groups = await _userRepository.GetGroupsByIdsAsync(mutualGroupIds);

        return groups.Select(g => new MutualGroupResponse
        {
            Id = g.Id,
            Name = g.Name
        }).ToList();
    }

    /// <inheritdoc />
    public async Task<UserDataExportResponse> ExportUserDataAsync(Guid userId)
    {
        ValidateUserId(userId);

        var user = await GetUserOrThrowAsync(userId);

        try
        {
            var exportData = await FetchAllUserDataAsync(userId, user);
            return exportData;
        }
        catch (Exception ex) when (ex is not KeyNotFoundException and not ArgumentException)
        {
            // Wrap unexpected exceptions with more context for debugging
            throw new InvalidOperationException(
                $"Failed to export user data. Please try again later. Error: {ex.Message}", ex);
        }
    }

    #region Data Export Private Methods

    private async Task<UserDataExportResponse> FetchAllUserDataAsync(Guid userId, User user)
    {
        var preferencesTask = _preferencesRepository.GetByUserIdAsync(userId);
        var stepEntriesTask = FetchAllStepEntriesAsync(userId);
        var friendshipsTask = FetchAllFriendshipsWithNamesAsync(userId);
        var groupMembershipsTask = FetchAllGroupMembershipsWithNamesAsync(userId);
        var activityItemsTask = FetchAllActivityItemsAsync(userId);
        var notificationsTask = FetchAllNotificationsAsync(userId);

        await Task.WhenAll(
            preferencesTask,
            stepEntriesTask,
            friendshipsTask,
            groupMembershipsTask,
            activityItemsTask,
            notificationsTask);

        var preferences = await preferencesTask;
        var stepEntries = await stepEntriesTask;
        var friendships = await friendshipsTask;
        var groupMemberships = await groupMembershipsTask;
        var activityItems = await activityItemsTask;
        var notifications = await notificationsTask;

        return BuildExportResponse(userId, user, preferences, stepEntries, friendships, groupMemberships, activityItems, notifications);
    }

    private UserDataExportResponse BuildExportResponse(
        Guid userId,
        User user,
        UserPreferencesEntity? preferences,
        List<ExportedStepEntry> stepEntries,
        List<ExportedFriendship> friendships,
        List<ExportedGroupMembership> groupMemberships,
        List<ExportedActivityItem> activityItems,
        List<ExportedNotification> notifications)
    {
        var metadata = CreateExportMetadata(userId);
        var profile = CreateExportedProfile(user);
        var exportedPreferences = CreateExportedPreferences(preferences);

        return new UserDataExportResponse(
            metadata,
            profile,
            exportedPreferences,
            stepEntries,
            friendships,
            groupMemberships,
            activityItems,
            notifications);
    }

    private static ExportMetadata CreateExportMetadata(Guid userId)
    {
        return new ExportMetadata(
            ExportedAt: DateTime.UtcNow,
            UserId: userId,
            DataFormat: ExportDataFormatVersion);
    }

    private static ExportedProfile CreateExportedProfile(User user)
    {
        return new ExportedProfile(
            Id: user.Id,
            Email: null, // Email is stored in Supabase Auth, not accessible from users table
            DisplayName: user.DisplayName ?? string.Empty,
            AvatarUrl: user.AvatarUrl,
            QrCodeId: user.QrCodeId ?? string.Empty,
            OnboardingCompleted: user.OnboardingCompleted,
            CreatedAt: user.CreatedAt);
    }

    private static ExportedPreferences CreateExportedPreferences(UserPreferencesEntity? preferences)
    {
        if (preferences == null)
        {
            return CreateDefaultExportedPreferences();
        }

        return new ExportedPreferences(
            DailyStepGoal: preferences.DailyStepGoal,
            Units: preferences.Units ?? "metric",
            NotificationsEnabled: preferences.NotificationsEnabled,
            NotifyDailyReminder: preferences.NotifyDailyReminder,
            NotifyFriendRequests: preferences.NotifyFriendRequests,
            NotifyGroupInvites: preferences.NotifyGroupInvites,
            NotifyAchievements: preferences.NotifyAchievements,
            PrivacyProfileVisibility: preferences.PrivacyProfileVisibility ?? "public",
            PrivacyFindMe: preferences.PrivacyFindMe ?? "public",
            PrivacyShowSteps: preferences.PrivacyShowSteps ?? "partial");
    }

    private static ExportedPreferences CreateDefaultExportedPreferences()
    {
        return new ExportedPreferences(
            DailyStepGoal: 10000,
            Units: "metric",
            NotificationsEnabled: true,
            NotifyDailyReminder: true,
            NotifyFriendRequests: true,
            NotifyGroupInvites: true,
            NotifyAchievements: true,
            PrivacyProfileVisibility: "public",
            PrivacyFindMe: "public",
            PrivacyShowSteps: "partial");
    }

    private async Task<List<ExportedStepEntry>> FetchAllStepEntriesAsync(Guid userId)
    {
        var summaries = await _stepRepository.GetAllDailySummariesAsync(userId);

        return summaries.Select(s => new ExportedStepEntry(
            Date: s.Date,
            StepCount: s.TotalSteps,
            DistanceMeters: s.TotalDistanceMeters,
            Source: null, // Summaries aggregate sources
            RecordedAt: s.Date.ToDateTime(TimeOnly.MinValue))).ToList();
    }

    private async Task<List<ExportedFriendship>> FetchAllFriendshipsWithNamesAsync(Guid userId)
    {
        var friendships = await _friendRepository.GetFriendsAsync(userId);
        var pendingIncoming = await _friendRepository.GetPendingRequestsAsync(userId);
        var pendingOutgoing = await _friendRepository.GetSentRequestsAsync(userId);

        var allFriendships = friendships.Concat(pendingIncoming).Concat(pendingOutgoing).ToList();

        if (allFriendships.Count == 0)
        {
            return [];
        }

        var friendIds = allFriendships
            .Select(f => f.RequesterId == userId ? f.AddresseeId : f.RequesterId)
            .Distinct()
            .ToList();

        var users = await _userRepository.GetByIdsAsync(friendIds);
        var userDict = users.ToDictionary(u => u.Id, u => u.DisplayName);

        return allFriendships.Select(f => MapToExportedFriendship(f, userId, userDict)).ToList();
    }

    private static ExportedFriendship MapToExportedFriendship(
        Friendship f,
        Guid userId,
        Dictionary<Guid, string> userDict)
    {
        var friendId = f.RequesterId == userId ? f.AddresseeId : f.RequesterId;
        var friendName = userDict.GetValueOrDefault(friendId, "Unknown User") ?? "Unknown User";
        var initiatedByMe = f.RequesterId == userId;

        return new ExportedFriendship(
            FriendId: friendId,
            FriendDisplayName: friendName,
            Status: f.Status.ToString().ToLowerInvariant(),
            InitiatedByMe: initiatedByMe,
            CreatedAt: f.CreatedAt);
    }

    private async Task<List<ExportedGroupMembership>> FetchAllGroupMembershipsWithNamesAsync(Guid userId)
    {
        var memberships = await _groupRepository.GetUserGroupMembershipsWithDetailsAsync(userId);

        return memberships.Select(m => new ExportedGroupMembership(
            GroupId: m.Group.Id,
            GroupName: m.Group.Name ?? string.Empty,
            Role: m.Role.ToString().ToLowerInvariant(),
            JoinedAt: m.JoinedAt)).ToList();
    }

    private async Task<List<ExportedActivityItem>> FetchAllActivityItemsAsync(Guid userId)
    {
        // Fetch activity items for the user only (not friends) by passing an empty friend list.
        // The GetFeedAsync method filters by user_id, so with an empty friend list,
        // only activities where user_id equals the provided userId are returned.
        var activities = await _activityRepository.GetFeedAsync(userId, [], MaxExportActivityItems, 0);

        return activities.Select(a => new ExportedActivityItem(
            Id: a.Id,
            Type: a.Type ?? string.Empty,
            Message: a.Message ?? string.Empty,
            CreatedAt: a.CreatedAt)).ToList();
    }

    private async Task<List<ExportedNotification>> FetchAllNotificationsAsync(Guid userId)
    {
        var (notifications, _, _) = await _notificationRepository.GetAllAsync(userId, MaxExportNotifications, 0);

        return notifications.Select(n => new ExportedNotification(
            Id: n.Id,
            Type: n.Type.ToString().ToLowerInvariant(),
            Title: n.Title ?? string.Empty,
            Body: n.Message ?? string.Empty,
            CreatedAt: n.CreatedAt,
            ReadAt: n.IsRead ? n.UpdatedAt : null)).ToList();
    }

    #endregion

    #region Private Helper Methods

    private static void ValidateUserId(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }
    }

    private static void ValidateOtherUserId(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("Other user ID cannot be empty.", nameof(userId));
        }
    }

    private async Task<User> GetUserOrThrowAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);

        if (user == null)
        {
            throw new KeyNotFoundException($"User profile not found for user ID: {userId}");
        }

        return user;
    }

    private async Task EnsureUserPreferencesExistAsync(Guid userId)
    {
        var preferences = await _preferencesRepository.GetByUserIdAsync(userId);

        if (preferences == null)
        {
            try
            {
                await _preferencesRepository.CreateAsync(userId);
            }
            catch (PostgrestException ex) when (ex.Message.Contains("23505") || ex.Message.Contains("duplicate key"))
            {
                // Race condition: preferences were created between our check and insert - that's fine
            }
        }
    }

    private static User CreateDefaultUser(Guid userId)
    {
        var defaultName = $"{DefaultDisplayNamePrefix}{userId:N}";

        return new User
        {
            Id = userId,
            DisplayName = defaultName.Length > DefaultDisplayNameMaxLength
                ? defaultName.Substring(0, DefaultDisplayNameMaxLength)
                : defaultName,
            QrCodeId = GenerateQrCodeId(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            OnboardingCompleted = false
        };
    }

    private static string GenerateQrCodeId()
    {
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        var bytes = new byte[8];
        rng.GetBytes(bytes);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static void ValidateDisplayName(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new ArgumentException("Display name cannot be empty.");
        }

        if (displayName.Length < 2)
        {
            throw new ArgumentException("Display name must be at least 2 characters long.");
        }

        if (displayName.Length > 50)
        {
            throw new ArgumentException("Display name must not exceed 50 characters.");
        }
    }

    private static void ValidateAvatarUrl(string? avatarUrl)
    {
        if (!string.IsNullOrWhiteSpace(avatarUrl))
        {
            if (!Uri.TryCreate(avatarUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                throw new ArgumentException("Avatar URL must be a valid HTTP or HTTPS URL.");
            }
        }
    }

    private static void ValidateUpdatePreferencesRequest(UpdateUserPreferencesRequest request)
    {
        if (request.DailyStepGoal.HasValue)
        {
            ValidateDailyStepGoal(request.DailyStepGoal.Value);
        }

        if (!string.IsNullOrEmpty(request.DistanceUnit))
        {
            ValidateDistanceUnit(request.DistanceUnit);
        }
    }

    private static void ValidateDailyStepGoal(int stepGoal)
    {
        if (stepGoal < MinDailyStepGoal || stepGoal > MaxDailyStepGoal)
        {
            throw new ArgumentException(
                $"Daily step goal must be between {MinDailyStepGoal} and {MaxDailyStepGoal}.");
        }
    }

    private static void ValidateDistanceUnit(string unit)
    {
        if (!ValidDistanceUnits.Contains(unit))
        {
            throw new ArgumentException("Distance unit must be either 'metric' or 'imperial'.");
        }
    }

    private static void ApplyPreferencesUpdate(UserPreferencesEntity preferences, UpdateUserPreferencesRequest request)
    {
        if (request.NotificationsEnabled.HasValue)
        {
            preferences.NotifyDailyReminder = request.NotificationsEnabled.Value;
        }

        if (request.DailyStepGoal.HasValue)
        {
            preferences.DailyStepGoal = request.DailyStepGoal.Value;
        }

        if (!string.IsNullOrEmpty(request.DistanceUnit))
        {
            preferences.Units = request.DistanceUnit;
        }

        if (request.PrivateProfile.HasValue)
        {
            preferences.PrivacyProfileVisibility = request.PrivateProfile.Value ? "private" : "public";
        }
    }

    private static void ApplyProfileUpdates(User user, UpdateProfileRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.DisplayName))
        {
            ValidateDisplayName(request.DisplayName);
            user.DisplayName = request.DisplayName;
        }

        if (request.AvatarUrl != null)
        {
            ValidateAvatarUrl(request.AvatarUrl);
            user.AvatarUrl = request.AvatarUrl;
        }

        if (request.OnboardingCompleted.HasValue)
        {
            user.OnboardingCompleted = request.OnboardingCompleted.Value;
        }
    }

    private static void ValidateAvatarFile(Stream fileStream, string fileName, string contentType)
    {
        ArgumentNullException.ThrowIfNull(fileStream);

        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new ArgumentException("File name cannot be empty.", nameof(fileName));
        }

        if (string.IsNullOrWhiteSpace(contentType))
        {
            throw new ArgumentException("Content type cannot be empty.", nameof(contentType));
        }

        ValidateContentType(contentType);
        ValidateFileExtension(fileName);
        ValidateFileSize(fileStream);
    }

    private static void ValidateContentType(string contentType)
    {
        if (!AllowedImageContentTypes.Contains(contentType))
        {
            throw new ArgumentException(
                $"Invalid file type. Allowed types: {string.Join(", ", AllowedImageContentTypes)}");
        }
    }

    private static void ValidateFileExtension(string fileName)
    {
        var extension = Path.GetExtension(fileName);

        if (string.IsNullOrEmpty(extension) || !AllowedImageExtensions.Contains(extension))
        {
            throw new ArgumentException(
                $"Invalid file extension. Allowed extensions: {string.Join(", ", AllowedImageExtensions)}");
        }
    }

    private static void ValidateFileSize(Stream fileStream)
    {
        if (fileStream.Length > MaxAvatarFileSizeBytes)
        {
            throw new ArgumentException(
                $"File size exceeds maximum allowed size of {MaxAvatarFileSizeBytes / (1024 * 1024)}MB.");
        }
    }

    private async Task<string> UploadAvatarToStorageAsync(Guid userId, Stream fileStream, string fileName, string contentType)
    {
        var client = await GetAuthenticatedClientAsync();
        var extension = Path.GetExtension(fileName);
        var storagePath = $"{userId}{extension}";

        var fileBytes = await ReadStreamToBytesAsync(fileStream);

        await client.Storage
            .From(AvatarsBucketName)
            .Upload(fileBytes, storagePath, new Supabase.Storage.FileOptions
            {
                ContentType = contentType,
                Upsert = true
            });

        var publicUrl = client.Storage
            .From(AvatarsBucketName)
            .GetPublicUrl(storagePath);

        return publicUrl;
    }

    private static async Task<byte[]> ReadStreamToBytesAsync(Stream stream)
    {
        using var memoryStream = new MemoryStream();
        await stream.CopyToAsync(memoryStream);
        return memoryStream.ToArray();
    }

    private async Task<Supabase.Client> GetAuthenticatedClientAsync()
    {
        if (_httpContextAccessor.HttpContext?.Items.TryGetValue("SupabaseToken", out var tokenObj) != true)
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var token = tokenObj as string;
        if (string.IsNullOrEmpty(token))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return await _clientFactory.CreateClientAsync(token);
    }

    private static UserPreferencesResponse MapToPreferencesResponse(UserPreferencesEntity preferences)
    {
        return new UserPreferencesResponse(
            NotificationsEnabled: preferences.NotifyDailyReminder,
            DailyStepGoal: preferences.DailyStepGoal,
            DistanceUnit: preferences.Units,
            PrivateProfile: preferences.PrivacyProfileVisibility == "private"
        );
    }

    private static GetProfileResponse MapToGetProfileResponse(User user)
    {
        return new GetProfileResponse
        {
            Id = user.Id,
            DisplayName = user.DisplayName,
            AvatarUrl = user.AvatarUrl,
            CreatedAt = user.CreatedAt,
            OnboardingCompleted = user.OnboardingCompleted
        };
    }

    private static int CalculateTotalSteps(List<(int StepCount, double? DistanceMeters, DateOnly Date)> entries)
    {
        return entries.Sum(e => e.StepCount);
    }

    private static double CalculateTotalDistance(List<(int StepCount, double? DistanceMeters, DateOnly Date)> entries)
    {
        return entries.Sum(e => e.DistanceMeters ?? 0);
    }

    private static int CalculateAverageSteps(int totalSteps)
    {
        const int daysInWeek = 7;
        return totalSteps / daysInWeek;
    }

    private async Task<int> CalculateCurrentStreakAsync(Guid userId)
    {
        var activityDates = await _userRepository.GetActivityDatesAsync(userId);

        if (activityDates.Count == 0)
        {
            return 0;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var yesterday = today.AddDays(-1);
        var streak = 0;

        // Check if the streak starts from today or yesterday
        var expectedDate = activityDates[0] == today ? today : yesterday;

        // If the most recent activity is neither today nor yesterday, streak is broken
        if (activityDates[0] != today && activityDates[0] != yesterday)
        {
            return 0;
        }

        foreach (var date in activityDates)
        {
            if (date == expectedDate)
            {
                streak++;
                expectedDate = expectedDate.AddDays(-1);
            }
            else if (date < expectedDate)
            {
                // Gap found, streak ends
                break;
            }
            // If date > expectedDate, skip duplicate dates (already counted)
        }

        return streak;
    }

    #endregion
}

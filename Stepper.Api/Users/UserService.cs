using Stepper.Api.Common.Database;
using Stepper.Api.Users.DTOs;

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
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserService(
        IUserRepository userRepository,
        IUserPreferencesRepository preferencesRepository,
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(userRepository);
        ArgumentNullException.ThrowIfNull(preferencesRepository);
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);

        _userRepository = userRepository;
        _preferencesRepository = preferencesRepository;
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
        ValidateUpdateProfileRequest(request);

        var existingUser = await _userRepository.GetByIdAsync(userId);

        if (existingUser == null)
        {
            throw new KeyNotFoundException($"User profile not found for user ID: {userId}");
        }

        existingUser.DisplayName = request.DisplayName;
        existingUser.AvatarUrl = request.AvatarUrl;

        if (request.OnboardingCompleted.HasValue)
        {
            existingUser.OnboardingCompleted = request.OnboardingCompleted.Value;
        }

        // Note: UpdatedAt is automatically set by the database trigger (update_users_updated_at)
        var updatedUser = await _userRepository.UpdateAsync(existingUser);

        return MapToGetProfileResponse(updatedUser);
    }

    /// <inheritdoc />
    public async Task<GetProfileResponse> EnsureProfileExistsAsync(Guid userId)
    {
        ValidateUserId(userId);

        var existingUser = await _userRepository.GetByIdAsync(userId);

        if (existingUser != null)
        {
            // Ensure user_preferences row exists
            await EnsureUserPreferencesExistAsync(userId);
            return MapToGetProfileResponse(existingUser);
        }

        var newUser = CreateDefaultUser(userId);
        var createdUser = await _userRepository.CreateAsync(newUser);

        // Create user_preferences row for new user
        await _preferencesRepository.CreateAsync(userId);

        return MapToGetProfileResponse(createdUser);
    }

    /// <inheritdoc />
    public async Task<UserPreferencesResponse> GetPreferencesAsync(Guid userId)
    {
        ValidateUserId(userId);

        // Verify user exists
        await GetUserOrThrowAsync(userId);

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
            await _preferencesRepository.CreateAsync(userId);
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Validates the update profile request.
    /// </summary>
    /// <remarks>
    /// Future considerations:
    /// - Add rate limiting to prevent abuse of profile updates (e.g., max 10 updates per hour)
    /// - Add profanity filter for display name validation to prevent inappropriate content
    /// </remarks>
    private static void ValidateUpdateProfileRequest(UpdateProfileRequest request)
    {
        ValidateDisplayName(request.DisplayName);
        ValidateAvatarUrl(request.AvatarUrl);
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

using System.Text.Json;
using Stepper.Api.Activity.DTOs;
using Stepper.Api.Friends;
using Stepper.Api.Users;

namespace Stepper.Api.Activity;

/// <summary>
/// Service implementation for activity feed business logic.
/// </summary>
public class ActivityService : IActivityService
{
    private readonly IActivityRepository _activityRepository;
    private readonly IFriendRepository _friendRepository;
    private readonly IUserRepository _userRepository;

    private const int MaxLimit = 100;
    private const int DefaultLimit = 20;

    /// <summary>
    /// Initializes a new instance of the <see cref="ActivityService"/> class.
    /// </summary>
    /// <param name="activityRepository">The activity repository.</param>
    /// <param name="friendRepository">The friend repository.</param>
    /// <param name="userRepository">The user repository.</param>
    public ActivityService(
        IActivityRepository activityRepository,
        IFriendRepository friendRepository,
        IUserRepository userRepository)
    {
        ArgumentNullException.ThrowIfNull(activityRepository);
        ArgumentNullException.ThrowIfNull(friendRepository);
        ArgumentNullException.ThrowIfNull(userRepository);

        _activityRepository = activityRepository;
        _friendRepository = friendRepository;
        _userRepository = userRepository;
    }

    /// <inheritdoc />
    public async Task<ActivityFeedResponse> GetFeedAsync(Guid userId, int limit = DefaultLimit, int offset = 0)
    {
        ValidateParameters(userId, ref limit, ref offset);

        var friendIds = await GetFriendIdsAsync(userId);
        var activities = await _activityRepository.GetFeedAsync(userId, friendIds, limit, offset);
        var totalCount = await _activityRepository.GetFeedCountAsync(userId, friendIds);

        var userProfiles = await GetUserProfilesAsync(activities);
        var items = MapToActivityItemResponses(activities, userProfiles);
        var hasMore = CalculateHasMore(offset, limit, totalCount);

        return new ActivityFeedResponse(items, totalCount, hasMore);
    }

    /// <inheritdoc />
    public async Task<ActivityItemResponse> GetByIdAsync(Guid userId, Guid activityId)
    {
        ValidateGetByIdParameters(userId, activityId);

        var activity = await _activityRepository.GetByIdAsync(activityId);

        EnsureActivityExists(activity, activityId);

        var userProfile = await GetUserProfileAsync(activity!.UserId);

        return MapToActivityItemResponse(activity, userProfile);
    }

    private static void ValidateGetByIdParameters(Guid userId, Guid activityId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (activityId == Guid.Empty)
        {
            throw new ArgumentException("Activity ID cannot be empty.", nameof(activityId));
        }
    }

    private static void EnsureActivityExists(ActivityItem? activity, Guid activityId)
    {
        if (activity == null)
        {
            throw new KeyNotFoundException($"Activity not found: {activityId}");
        }
    }

    private async Task<User?> GetUserProfileAsync(Guid userId)
    {
        var users = await _userRepository.GetByIdsAsync(new List<Guid> { userId });
        return users.FirstOrDefault();
    }

    private static ActivityItemResponse MapToActivityItemResponse(ActivityItem activity, User? userProfile)
    {
        return new ActivityItemResponse(
            Id: activity.Id,
            UserId: activity.UserId,
            UserName: userProfile?.DisplayName ?? "Unknown User",
            UserAvatarUrl: userProfile?.AvatarUrl,
            Type: activity.Type,
            Message: activity.Message,
            Metadata: ParseMetadata(activity.Metadata),
            CreatedAt: activity.CreatedAt,
            RelatedUserId: activity.RelatedUserId,
            RelatedGroupId: activity.RelatedGroupId
        );
    }

    private static void ValidateParameters(Guid userId, ref int limit, ref int offset)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        limit = Math.Clamp(limit, 1, MaxLimit);
        offset = Math.Max(offset, 0);
    }

    private async Task<List<Guid>> GetFriendIdsAsync(Guid userId)
    {
        var friendships = await _friendRepository.GetFriendsAsync(userId);

        return friendships
            .Select(f => f.RequesterId == userId ? f.AddresseeId : f.RequesterId)
            .Distinct()
            .ToList();
    }

    private async Task<Dictionary<Guid, User>> GetUserProfilesAsync(List<ActivityItem> activities)
    {
        var userIds = activities
            .Select(a => a.UserId)
            .Distinct()
            .ToList();

        if (userIds.Count == 0)
        {
            return new Dictionary<Guid, User>();
        }

        var users = await _userRepository.GetByIdsAsync(userIds);
        return users.ToDictionary(u => u.Id);
    }

    private static List<ActivityItemResponse> MapToActivityItemResponses(
        List<ActivityItem> activities,
        Dictionary<Guid, User> userProfiles)
    {
        return activities
            .Select(activity => MapToActivityItemResponse(activity, userProfiles))
            .ToList();
    }

    private static ActivityItemResponse MapToActivityItemResponse(
        ActivityItem activity,
        Dictionary<Guid, User> userProfiles)
    {
        var userProfile = userProfiles.GetValueOrDefault(activity.UserId);
        return MapToActivityItemResponse(activity, userProfile);
    }

    private static object? ParseMetadata(string? metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<object>(metadataJson);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static bool CalculateHasMore(int offset, int limit, int totalCount)
    {
        return offset + limit < totalCount;
    }
}

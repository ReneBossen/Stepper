using WalkingApp.Api.Users.DTOs;

namespace WalkingApp.Api.Users;

/// <summary>
/// Service implementation for user business logic.
/// </summary>
public class UserService : IUserService
{
    private const string DefaultDisplayNamePrefix = "User_";
    private const int DefaultDisplayNameMaxLength = 20;

    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        ArgumentNullException.ThrowIfNull(userRepository);
        _userRepository = userRepository;
    }

    /// <inheritdoc />
    public async Task<GetProfileResponse> GetProfileAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

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
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        ArgumentNullException.ThrowIfNull(request);

        ValidateUpdateProfileRequest(request);

        var existingUser = await _userRepository.GetByIdAsync(userId);

        if (existingUser == null)
        {
            throw new KeyNotFoundException($"User profile not found for user ID: {userId}");
        }

        existingUser.DisplayName = request.DisplayName;
        existingUser.AvatarUrl = request.AvatarUrl;

        if (request.Preferences != null)
        {
            existingUser.Preferences = request.Preferences;
        }

        // Note: UpdatedAt is automatically set by the database trigger (update_users_updated_at)
        // No need to set it manually here

        var updatedUser = await _userRepository.UpdateAsync(existingUser);

        return MapToGetProfileResponse(updatedUser);
    }

    /// <inheritdoc />
    public async Task<GetProfileResponse> EnsureProfileExistsAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        var existingUser = await _userRepository.GetByIdAsync(userId);

        if (existingUser != null)
        {
            return MapToGetProfileResponse(existingUser);
        }

        var defaultName = $"{DefaultDisplayNamePrefix}{userId:N}";
        var newUser = new User
        {
            Id = userId,
            DisplayName = defaultName.Length > DefaultDisplayNameMaxLength
                ? defaultName.Substring(0, DefaultDisplayNameMaxLength)
                : defaultName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Preferences = new UserPreferences()
        };

        var createdUser = await _userRepository.CreateAsync(newUser);

        return MapToGetProfileResponse(createdUser);
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
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            throw new ArgumentException("Display name cannot be empty.");
        }

        if (request.DisplayName.Length < 2)
        {
            throw new ArgumentException("Display name must be at least 2 characters long.");
        }

        if (request.DisplayName.Length > 50)
        {
            throw new ArgumentException("Display name must not exceed 50 characters.");
        }

        if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
        {
            if (!Uri.TryCreate(request.AvatarUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                throw new ArgumentException("Avatar URL must be a valid HTTP or HTTPS URL.");
            }
        }

        if (request.Preferences != null)
        {
            if (!string.IsNullOrEmpty(request.Preferences.Units) &&
                request.Preferences.Units != "metric" && request.Preferences.Units != "imperial")
            {
                throw new ArgumentException("Units must be either 'metric' or 'imperial'.");
            }
        }
    }

    private static GetProfileResponse MapToGetProfileResponse(User user)
    {
        return new GetProfileResponse
        {
            Id = user.Id,
            DisplayName = user.DisplayName,
            AvatarUrl = user.AvatarUrl,
            Preferences = user.Preferences,
            CreatedAt = user.CreatedAt
        };
    }
}

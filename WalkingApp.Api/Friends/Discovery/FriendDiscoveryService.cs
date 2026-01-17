using QRCoder;
using System.Security.Cryptography;
using WalkingApp.Api.Common.Database;
using WalkingApp.Api.Friends.Discovery.DTOs;
using WalkingApp.Api.Users;

namespace WalkingApp.Api.Friends.Discovery;

/// <summary>
/// Service implementation for friend discovery business logic.
/// </summary>
public class FriendDiscoveryService : IFriendDiscoveryService
{
    private readonly ISupabaseClientFactory _clientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserRepository _userRepository;
    private readonly IInviteCodeRepository _inviteCodeRepository;
    private readonly IFriendService _friendService;

    public FriendDiscoveryService(
        ISupabaseClientFactory clientFactory,
        IHttpContextAccessor httpContextAccessor,
        IUserRepository userRepository,
        IInviteCodeRepository inviteCodeRepository,
        IFriendService friendService)
    {
        ArgumentNullException.ThrowIfNull(clientFactory);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);
        ArgumentNullException.ThrowIfNull(userRepository);
        ArgumentNullException.ThrowIfNull(inviteCodeRepository);
        ArgumentNullException.ThrowIfNull(friendService);

        _clientFactory = clientFactory;
        _httpContextAccessor = httpContextAccessor;
        _userRepository = userRepository;
        _inviteCodeRepository = inviteCodeRepository;
        _friendService = friendService;
    }

    /// <inheritdoc />
    public async Task<SearchUsersResponse> SearchUsersAsync(Guid userId, string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            throw new ArgumentException("Search query cannot be empty.", nameof(query));
        }

        var client = await GetAuthenticatedClientAsync();

        // Call the search_users database function
        var result = await client.Rpc("search_users", new Dictionary<string, object>
        {
            { "search_query", query },
            { "requesting_user_id", userId }
        });

        if (result?.Content == null)
        {
            return new SearchUsersResponse
            {
                Users = new List<UserSearchResult>(),
                TotalCount = 0
            };
        }

        // Parse the result
        var users = System.Text.Json.JsonSerializer.Deserialize<List<UserSearchResult>>(
            result.Content,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        ) ?? new List<UserSearchResult>();

        return new SearchUsersResponse
        {
            Users = users,
            TotalCount = users.Count
        };
    }

    /// <inheritdoc />
    public async Task<QrCodeResponse> GetMyQrCodeAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException($"User not found: {userId}");
        }

        // Generate deep link
        var deepLink = $"walkingapp://invite/{user.QrCodeId}";

        // Generate QR code
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(deepLink, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);

        var qrCodeBytes = qrCode.GetGraphic(20);
        var qrCodeBase64 = Convert.ToBase64String(qrCodeBytes);

        return new QrCodeResponse
        {
            QrCodeId = user.QrCodeId,
            QrCodeImage = qrCodeBase64,
            DeepLink = deepLink
        };
    }

    /// <inheritdoc />
    public async Task<UserSearchResult> GetUserByQrCodeAsync(string qrCodeId)
    {
        if (string.IsNullOrWhiteSpace(qrCodeId))
        {
            throw new ArgumentException("QR code ID cannot be empty.", nameof(qrCodeId));
        }

        var client = await GetAuthenticatedClientAsync();

        // Call the get_user_by_qr_code database function
        var result = await client.Rpc("get_user_by_qr_code", new Dictionary<string, object>
        {
            { "qr_code", qrCodeId }
        });

        if (result?.Content == null)
        {
            throw new KeyNotFoundException($"User not found for QR code: {qrCodeId}");
        }

        // Parse the result (returns a single user as an array with one element)
        var users = System.Text.Json.JsonSerializer.Deserialize<List<UserSearchResult>>(
            result.Content,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );

        var user = users?.FirstOrDefault();
        if (user == null)
        {
            throw new KeyNotFoundException($"User not found for QR code: {qrCodeId}");
        }

        return user;
    }

    /// <inheritdoc />
    public async Task<GenerateInviteLinkResponse> GenerateInviteLinkAsync(Guid userId, GenerateInviteLinkRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Validate request
        if (request.ExpirationHours.HasValue && request.ExpirationHours.Value <= 0)
        {
            throw new ArgumentException("Expiration hours must be positive.", nameof(request.ExpirationHours));
        }

        if (request.MaxUsages.HasValue && request.MaxUsages.Value <= 0)
        {
            throw new ArgumentException("Max usages must be positive.", nameof(request.MaxUsages));
        }

        // Generate cryptographically random code
        var code = GenerateSecureCode();

        // Calculate expiration
        DateTime? expiresAt = null;
        if (request.ExpirationHours.HasValue)
        {
            expiresAt = DateTime.UtcNow.AddHours(request.ExpirationHours.Value);
        }

        // Create invite code
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Code = code,
            Type = InviteCodeType.ShareLink,
            ExpiresAt = expiresAt,
            MaxUsages = request.MaxUsages,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        await _inviteCodeRepository.CreateAsync(inviteCode);

        var deepLink = $"walkingapp://invite/{code}";

        return new GenerateInviteLinkResponse
        {
            Code = code,
            DeepLink = deepLink,
            ExpiresAt = expiresAt,
            MaxUsages = request.MaxUsages
        };
    }

    /// <inheritdoc />
    public async Task RedeemInviteCodeAsync(Guid userId, string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Invite code cannot be empty.", nameof(code));
        }

        var client = await GetAuthenticatedClientAsync();

        // Call the validate_invite_code database function
        var result = await client.Rpc("validate_invite_code", new Dictionary<string, object>
        {
            { "code_to_validate", code }
        });

        if (result?.Content == null)
        {
            throw new InvalidOperationException("Failed to validate invite code.");
        }

        // Parse the result
        var validationResults = System.Text.Json.JsonSerializer.Deserialize<List<InviteCodeValidationResult>>(
            result.Content,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );

        var validation = validationResults?.FirstOrDefault();
        if (validation == null || !validation.Valid)
        {
            var errorMessage = validation?.ErrorMessage ?? "Invalid invite code.";
            throw new InvalidOperationException(errorMessage);
        }

        // Check if trying to add self
        if (validation.UserId == userId)
        {
            throw new InvalidOperationException("Cannot send friend request to yourself.");
        }

        // Send friend request using existing FriendService
        await _friendService.SendFriendRequestAsync(userId, new DTOs.SendFriendRequestRequest
        {
            FriendId = validation.UserId
        });
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

    private static string GenerateSecureCode()
    {
        // Generate 16 bytes of random data
        var bytes = RandomNumberGenerator.GetBytes(16);
        // Convert to base64 URL-safe string (no padding)
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    /// <summary>
    /// Internal class for deserializing the validate_invite_code function result.
    /// </summary>
    private class InviteCodeValidationResult
    {
        public bool Valid { get; set; }
        public Guid UserId { get; set; }
        public string? ErrorMessage { get; set; }
    }
}

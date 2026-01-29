using Stepper.Api.Friends.Discovery.DTOs;

namespace Stepper.Api.Friends.Discovery;

/// <summary>
/// Service interface for friend discovery business logic.
/// </summary>
public interface IFriendDiscoveryService
{
    /// <summary>
    /// Searches for users by display name.
    /// </summary>
    /// <param name="userId">The ID of the user performing the search.</param>
    /// <param name="query">The search query.</param>
    /// <returns>Search results with friendship status.</returns>
    Task<SearchUsersResponse> SearchUsersAsync(Guid userId, string query);

    /// <summary>
    /// Gets the current user's QR code for friend discovery.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <returns>QR code data including image and deep link.</returns>
    Task<QrCodeResponse> GetMyQrCodeAsync(Guid userId);

    /// <summary>
    /// Gets a user's information by their QR code ID.
    /// </summary>
    /// <param name="qrCodeId">The QR code identifier.</param>
    /// <returns>User search result.</returns>
    Task<UserSearchResult> GetUserByQrCodeAsync(string qrCodeId);

    /// <summary>
    /// Generates a shareable invite link.
    /// </summary>
    /// <param name="userId">The ID of the user generating the link.</param>
    /// <param name="request">Link generation parameters.</param>
    /// <returns>Generated invite link data.</returns>
    Task<GenerateInviteLinkResponse> GenerateInviteLinkAsync(Guid userId, GenerateInviteLinkRequest request);

    /// <summary>
    /// Redeems an invite code and sends a friend request.
    /// </summary>
    /// <param name="userId">The ID of the user redeeming the code.</param>
    /// <param name="code">The invite code to redeem.</param>
    /// <returns>The created friend request response.</returns>
    Task RedeemInviteCodeAsync(Guid userId, string code);
}

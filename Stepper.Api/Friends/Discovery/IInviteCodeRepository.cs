namespace Stepper.Api.Friends.Discovery;

/// <summary>
/// Repository interface for managing invite codes.
/// </summary>
public interface IInviteCodeRepository
{
    /// <summary>
    /// Creates a new invite code.
    /// </summary>
    /// <param name="inviteCode">The invite code to create.</param>
    /// <returns>The created invite code.</returns>
    Task<InviteCode> CreateAsync(InviteCode inviteCode);

    /// <summary>
    /// Gets an invite code by its code string.
    /// </summary>
    /// <param name="code">The code string.</param>
    /// <returns>The invite code, or null if not found.</returns>
    Task<InviteCode?> GetByCodeAsync(string code);

    /// <summary>
    /// Gets all invite codes for a user.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <returns>List of invite codes.</returns>
    Task<List<InviteCode>> GetByUserIdAsync(Guid userId);

    /// <summary>
    /// Updates an invite code.
    /// </summary>
    /// <param name="inviteCode">The invite code to update.</param>
    /// <returns>The updated invite code.</returns>
    Task<InviteCode> UpdateAsync(InviteCode inviteCode);

    /// <summary>
    /// Deletes an invite code.
    /// </summary>
    /// <param name="id">The ID of the invite code to delete.</param>
    Task DeleteAsync(Guid id);
}

namespace Stepper.Api.Users.DTOs;

/// <summary>
/// Response model for avatar upload operations.
/// </summary>
/// <param name="AvatarUrl">The public URL of the uploaded avatar.</param>
public record AvatarUploadResponse(string AvatarUrl);

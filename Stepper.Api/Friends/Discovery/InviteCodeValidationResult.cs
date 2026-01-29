namespace Stepper.Api.Friends.Discovery;

/// <summary>
/// Internal class for deserializing the validate_invite_code function result.
/// </summary>
internal class InviteCodeValidationResult
{
    public bool Valid { get; set; }
    public Guid UserId { get; set; }
    public string? ErrorMessage { get; set; }
}

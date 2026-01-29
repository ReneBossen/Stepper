namespace Stepper.Api.Friends.Discovery.DTOs;

/// <summary>
/// Response DTO containing QR code data.
/// </summary>
public class QrCodeResponse
{
    /// <summary>
    /// The QR code ID (used in the QR code payload).
    /// </summary>
    public string QrCodeId { get; set; } = string.Empty;

    /// <summary>
    /// Base64-encoded PNG image of the QR code.
    /// </summary>
    public string QrCodeImage { get; set; } = string.Empty;

    /// <summary>
    /// Deep link URL encoded in the QR code.
    /// </summary>
    public string DeepLink { get; set; } = string.Empty;
}

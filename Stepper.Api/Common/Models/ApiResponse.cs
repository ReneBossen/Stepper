namespace Stepper.Api.Common.Models;

/// <summary>
/// Standard API response wrapper for consistent response format.
/// </summary>
/// <typeparam name="T">The type of data being returned.</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Indicates whether the operation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The data payload for successful responses.
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// List of error messages for failed responses.
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// Creates a successful response with data.
    /// </summary>
    /// <param name="data">The response data.</param>
    /// <returns>A successful ApiResponse instance.</returns>
    public static ApiResponse<T> SuccessResponse(T data)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data
        };
    }

    /// <summary>
    /// Creates an error response with error messages.
    /// </summary>
    /// <param name="errors">The error messages.</param>
    /// <returns>An error ApiResponse instance.</returns>
    public static ApiResponse<T> ErrorResponse(params string[] errors)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Data = default,
            Errors = errors.ToList()
        };
    }

    /// <summary>
    /// Creates an error response with a single error message.
    /// </summary>
    /// <param name="error">The error message.</param>
    /// <returns>An error ApiResponse instance.</returns>
    public static ApiResponse<T> ErrorResponse(string error)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Data = default,
            Errors = new List<string> { error }
        };
    }
}

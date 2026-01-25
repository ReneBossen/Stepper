/**
 * Standard API response format from the .NET backend.
 * Matches the ApiResponse<T> format used by the backend.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors: string[];
}

/**
 * Error response format from the backend.
 * Returned when success is false.
 */
export interface ApiErrorResponse {
  success: false;
  data: null;
  errors: string[];
}

/**
 * Custom error class for API errors.
 * Provides structured error information including HTTP status code
 * and multiple error messages from the backend.
 */
export class ApiError extends Error {
  /**
   * Creates a new ApiError instance.
   *
   * @param message - Primary error message
   * @param statusCode - HTTP status code (0 for network errors)
   * @param errors - Array of all error messages from the backend
   */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errors: string[] = []
  ) {
    super(message);
    this.name = 'ApiError';

    // Maintains proper stack trace in V8 environments (Node/Chrome)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Creates an ApiError from a backend error response.
   *
   * @param response - The error response from the backend
   * @param statusCode - The HTTP status code
   * @returns A new ApiError instance
   */
  static fromResponse(response: ApiErrorResponse, statusCode: number): ApiError {
    const message = response.errors[0] || 'An error occurred';
    return new ApiError(message, statusCode, response.errors);
  }

  /**
   * Checks if this error represents a network/connectivity issue.
   */
  get isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  /**
   * Checks if this error represents a timeout.
   */
  get isTimeout(): boolean {
    return this.statusCode === 408;
  }

  /**
   * Checks if this error represents an authentication failure.
   */
  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Checks if this error represents a forbidden action.
   */
  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  /**
   * Checks if this error represents a not found resource.
   */
  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Checks if this error represents a server error (5xx).
   */
  get isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }
}

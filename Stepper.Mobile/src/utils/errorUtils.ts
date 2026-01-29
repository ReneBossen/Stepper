/**
 * Extracts an error message from an unknown error type.
 * This is the recommended way to handle errors in catch blocks
 * instead of using `catch (error: any)`.
 *
 * @param error - The caught error of unknown type
 * @param fallbackMessage - Optional fallback message if error message cannot be extracted
 * @returns The error message string
 */
export function getErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred'): string {
  if (error instanceof Error) {
    // Return fallback if error.message is empty
    return error.message || fallbackMessage;
  }
  if (typeof error === 'string') {
    return error || fallbackMessage;
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message || fallbackMessage;
  }
  return fallbackMessage;
}

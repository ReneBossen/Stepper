/**
 * Utility functions for string formatting and manipulation.
 */

/**
 * Extracts initials from a display name.
 * Takes the first letter of each word and returns up to 2 characters.
 *
 * @param name - The display name to extract initials from
 * @returns The initials (1-2 uppercase characters)
 *
 * @example
 * getInitials('John Doe') // Returns 'JD'
 * getInitials('Alice') // Returns 'A'
 * getInitials('John Michael Smith') // Returns 'JM'
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) {
    return '';
  }

  return name
    .split(' ')
    .filter((part) => part.length > 0)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validates that a string contains only alphanumeric characters.
 *
 * @param value - The string to validate
 * @returns True if the string contains only letters and numbers
 */
export function isAlphanumeric(value: string): boolean {
  return /^[A-Za-z0-9]+$/.test(value);
}

/**
 * Formats a date string as a short month and year.
 *
 * @param dateStr - ISO date string to format
 * @returns Formatted date string (e.g., "Jan 2024")
 *
 * @example
 * formatJoinDate('2024-01-15T12:00:00Z') // Returns 'Jan 2024'
 */
export function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Formats a username with @ prefix, handling undefined/null values.
 *
 * @param username - The username to format (may be undefined/null)
 * @param fallback - Fallback value if username is not provided (default: 'unknown')
 * @returns Formatted username with @ prefix
 *
 * @example
 * formatUsername('johndoe') // Returns '@johndoe'
 * formatUsername(undefined) // Returns '@unknown'
 * formatUsername(null, 'user') // Returns '@user'
 */
export function formatUsername(username: string | null | undefined, fallback = 'unknown'): string {
  return `@${username ?? fallback}`;
}

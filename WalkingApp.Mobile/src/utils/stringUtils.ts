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

/**
 * Utility functions for group-related formatting and display.
 */

/**
 * Returns a user-friendly label for a competition type.
 *
 * @param type - The competition type ('daily', 'weekly', or 'monthly')
 * @returns The formatted label for display
 */
export function getCompetitionTypeLabel(type: string): string {
  switch (type) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/**
 * Returns a label for competition type with "Competition" suffix.
 * Used in contexts where more descriptive text is needed.
 *
 * @param type - The competition type ('daily', 'weekly', or 'monthly')
 * @returns The formatted label with "Competition" suffix
 */
export function getCompetitionTypeLabelFull(type: string): string {
  return `${getCompetitionTypeLabel(type)} Competition`;
}

/**
 * Returns the period label prefix for a competition type.
 *
 * @param type - The competition type ('daily', 'weekly', or 'monthly')
 * @returns The period label (e.g., 'Today', 'This Week', 'This Month')
 */
export function getPeriodLabel(type: string): string {
  switch (type) {
    case 'daily':
      return 'Today';
    case 'weekly':
      return 'This Week';
    case 'monthly':
      return 'This Month';
    default:
      return 'Current Period';
  }
}

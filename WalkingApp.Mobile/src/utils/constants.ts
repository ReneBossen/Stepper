/**
 * Application-wide constants.
 */

/**
 * Invite code configuration.
 */
export const INVITE_CODE = {
  /** Minimum length for invite codes */
  MIN_LENGTH: 6,
  /** Maximum length for invite codes */
  MAX_LENGTH: 12,
  /** Number of days an invite code is valid */
  VALIDITY_DAYS: 7,
} as const;

/**
 * Input validation limits.
 */
export const INPUT_LIMITS = {
  /** Maximum characters for group name */
  GROUP_NAME_MAX: 50,
  /** Minimum characters for group name */
  GROUP_NAME_MIN: 3,
  /** Maximum characters for group description */
  GROUP_DESCRIPTION_MAX: 500,
} as const;

/**
 * Debounce timing configuration (in milliseconds).
 */
export const DEBOUNCE = {
  /** Search input debounce time */
  SEARCH: 300,
} as const;

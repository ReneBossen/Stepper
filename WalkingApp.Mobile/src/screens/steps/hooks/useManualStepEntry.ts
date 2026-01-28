import { useState, useCallback } from 'react';
import { stepsApi, RecordStepsRequest, DailyStepsResponse } from '@services/api/stepsApi';
import { useStepsStore } from '@store/stepsStore';
import { estimateDistanceFromSteps } from '@utils/stepEstimation';
import { getErrorMessage } from '@utils/errorUtils';

/**
 * Entry mode for manual step entry.
 * - 'override': Replace any existing entry for the date
 * - 'add': Add to existing entry for the date
 */
export type ManualEntryMode = 'override' | 'add';

/**
 * Result of a manual entry submission.
 */
interface ManualEntryResult {
  success: boolean;
  error?: string;
}

/**
 * Validation errors for manual step entry form fields.
 */
interface ValidationErrors {
  steps?: string;
  distance?: string;
  date?: string;
}

// Validation constants
const MAX_STEPS = 200000;
const MAX_DISTANCE_METERS = 500000; // ~310 miles or ~500 km
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Fetches the existing step entry for a specific date.
 *
 * @param date - The date to check for existing entry
 * @returns The existing entry or null if none exists
 */
async function getExistingEntryForDate(date: Date): Promise<DailyStepsResponse | null> {
  const dateString = date.toISOString().split('T')[0];
  try {
    const entries = await stepsApi.getDailyHistory({
      startDate: dateString,
      endDate: dateString,
    });
    return entries.length > 0 ? entries[0] : null;
  } catch {
    // If we can't fetch, return null and let the submission handle errors
    return null;
  }
}

/**
 * Hook for managing manual step entry logic.
 * Handles validation, submission, and state management for adding steps manually.
 */
export function useManualStepEntry() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingEntry, setExistingEntry] = useState<DailyStepsResponse | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const { fetchTodaySteps, fetchStats } = useStepsStore();

  /**
   * Validates the manual entry form fields.
   *
   * @param stepCount - The number of steps entered
   * @param date - The date for the entry
   * @param distanceMeters - Optional distance in meters
   * @returns Object containing validation errors for each field
   */
  const validateEntry = useCallback((
    stepCount: number,
    date: Date,
    distanceMeters?: number
  ): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Validate step count
    if (isNaN(stepCount) || stepCount < 0) {
      errors.steps = 'Step count cannot be negative';
    } else if (stepCount > MAX_STEPS) {
      errors.steps = `Step count seems too high. Maximum is ${MAX_STEPS.toLocaleString()}.`;
    } else if (!Number.isInteger(stepCount)) {
      errors.steps = 'Please enter a whole number';
    }

    // Validate date - cannot be in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      errors.date = 'Cannot enter steps for future dates';
    }

    // Validate date - cannot be more than 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setTime(oneYearAgo.getTime() - ONE_YEAR_MS);
    oneYearAgo.setHours(0, 0, 0, 0);
    if (date < oneYearAgo) {
      errors.date = 'Cannot enter steps for dates more than 1 year ago';
    }

    // Validate distance if provided
    if (distanceMeters !== undefined) {
      if (distanceMeters < 0) {
        errors.distance = 'Distance cannot be negative';
      } else if (distanceMeters > MAX_DISTANCE_METERS) {
        errors.distance = 'Distance seems too high';
      }
    }

    return errors;
  }, []);

  /**
   * Fetches and caches the existing entry for a date.
   * Call this when the date changes to update the helper text.
   *
   * @param date - The date to check for existing entry
   */
  const checkExistingEntry = useCallback(async (date: Date): Promise<void> => {
    setIsLoadingExisting(true);
    try {
      const entry = await getExistingEntryForDate(date);
      setExistingEntry(entry);
    } catch {
      setExistingEntry(null);
    } finally {
      setIsLoadingExisting(false);
    }
  }, []);

  /**
   * Clears the cached existing entry.
   */
  const clearExistingEntry = useCallback(() => {
    setExistingEntry(null);
  }, []);

  /**
   * Submits a manual step entry to the API.
   *
   * @param stepCount - The number of steps to record
   * @param date - The date for the entry
   * @param distanceMeters - Optional distance in meters (will be estimated if not provided)
   * @param mode - Entry mode: 'override' replaces existing, 'add' adds to existing
   * @returns Result indicating success or failure with error message
   */
  const submitEntry = useCallback(async (
    stepCount: number,
    date: Date,
    distanceMeters?: number,
    mode: ManualEntryMode = 'override'
  ): Promise<ManualEntryResult> => {
    setIsSubmitting(true);
    setError(null);

    try {
      let finalStepCount = stepCount;
      let finalDistance = distanceMeters ?? estimateDistanceFromSteps(stepCount);

      // If mode is 'add', fetch existing entry and add to it
      if (mode === 'add') {
        const existing = await getExistingEntryForDate(date);
        if (existing) {
          finalStepCount = existing.totalSteps + stepCount;
          // Add distances together if both exist, otherwise estimate for the added steps
          const existingDistance = existing.totalDistanceMeters || 0;
          const addedDistance = distanceMeters ?? estimateDistanceFromSteps(stepCount);
          finalDistance = existingDistance + addedDistance;
        }
      }

      // Format date as YYYY-MM-DD
      const dateString = date.toISOString().split('T')[0];

      // Use syncSteps which does UPSERT (insert or update)
      // This avoids duplicate key errors when an entry already exists
      await stepsApi.syncSteps({
        entries: [
          {
            date: dateString,
            stepCount: finalStepCount,
            distanceMeters: finalDistance,
            source: 'manual',
          },
        ],
      });

      // Refresh step data after successful submission
      await Promise.all([fetchTodaySteps(), fetchStats()]);

      return { success: true };
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchTodaySteps, fetchStats]);

  /**
   * Clears the current error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submitEntry,
    validateEntry,
    checkExistingEntry,
    clearExistingEntry,
    existingEntry,
    isLoadingExisting,
    isSubmitting,
    error,
    clearError,
  };
}

import { useState, useCallback } from 'react';
import { stepsApi, RecordStepsRequest } from '@services/api/stepsApi';
import { useStepsStore } from '@store/stepsStore';
import { estimateDistanceFromSteps } from '@utils/stepEstimation';
import { getErrorMessage } from '@utils/errorUtils';

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
 * Hook for managing manual step entry logic.
 * Handles validation, submission, and state management for adding steps manually.
 */
export function useManualStepEntry() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
   * Submits a manual step entry to the API.
   *
   * @param stepCount - The number of steps to record
   * @param date - The date for the entry
   * @param distanceMeters - Optional distance in meters (will be estimated if not provided)
   * @returns Result indicating success or failure with error message
   */
  const submitEntry = useCallback(async (
    stepCount: number,
    date: Date,
    distanceMeters?: number
  ): Promise<ManualEntryResult> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Use provided distance or estimate from steps
      const finalDistance = distanceMeters ?? estimateDistanceFromSteps(stepCount);

      // Format date as YYYY-MM-DD
      const dateString = date.toISOString().split('T')[0];

      const request: RecordStepsRequest = {
        stepCount,
        distanceMeters: finalDistance,
        date: dateString,
        source: 'manual',
      };

      await stepsApi.addSteps(request);

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
    isSubmitting,
    error,
    clearError,
  };
}

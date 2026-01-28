import { useState, useEffect, useCallback } from 'react';
import {
  SyncState,
  EnableResult,
  SyncResult,
  HealthSource,
} from '@services/health/types';
import { unifiedStepTrackingService } from '@services/stepTracking/unifiedStepTrackingService';
import { useStepsStore } from '@store/stepsStore';
import { getErrorMessage } from '@utils/errorUtils';

/**
 * Result type for the useStepTracking hook.
 */
export interface UseStepTrackingResult {
  /** Whether health tracking is available on this platform */
  isAvailable: boolean;
  /** Whether the user has enabled health tracking */
  isEnabled: boolean;
  /** Whether a sync operation is currently in progress */
  isSyncing: boolean;
  /** Current sync state (timestamps, status, platform) */
  syncState: SyncState | null;
  /** Error message from the last operation, if any */
  error: string | null;
  /** The health source for this platform (healthkit/googlefit) */
  healthSource: HealthSource | null;

  /** Enables health tracking (requests permission, syncs data) */
  enable: () => Promise<EnableResult>;
  /** Disables health tracking (removes synced data) */
  disable: () => Promise<void>;
  /** Triggers an on-demand sync */
  syncNow: () => Promise<SyncResult>;
  /** Refreshes the current state from the service */
  refresh: () => Promise<void>;
}

/**
 * React hook for interacting with the unified step tracking service.
 *
 * Provides reactive state management around the step tracking service,
 * handling loading states, errors, and automatic state updates.
 *
 * @returns Object containing state and actions for step tracking
 *
 * @example
 * ```tsx
 * function HealthSettingsScreen() {
 *   const {
 *     isAvailable,
 *     isEnabled,
 *     isSyncing,
 *     error,
 *     enable,
 *     disable,
 *     syncNow,
 *   } = useStepTracking();
 *
 *   if (!isAvailable) {
 *     return <Text>Health tracking not available</Text>;
 *   }
 *
 *   return (
 *     <Switch
 *       value={isEnabled}
 *       onValueChange={(value) => value ? enable() : disable()}
 *       disabled={isSyncing}
 *     />
 *   );
 * }
 * ```
 */
export function useStepTracking(): UseStepTrackingResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get refreshAfterSync from steps store if available
  const refreshAfterSync = useStepsStore((state) => state.refreshAfterSync);

  // Get health source (doesn't change during runtime)
  const healthSource = unifiedStepTrackingService.getHealthSource();

  /**
   * Refreshes the current state from the service.
   */
  const refresh = useCallback(async () => {
    try {
      setError(null);

      const [available, enabled, state] = await Promise.all([
        unifiedStepTrackingService.isHealthTrackingAvailable(),
        unifiedStepTrackingService.isHealthTrackingEnabled(),
        unifiedStepTrackingService.getSyncState(),
      ]);

      setIsAvailable(available);
      setIsEnabled(enabled);
      setSyncState(state);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  /**
   * Enables health tracking.
   */
  const enable = useCallback(async (): Promise<EnableResult> => {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await unifiedStepTrackingService.enableHealthTracking();

      if (result.success) {
        setIsEnabled(true);
        // Refresh sync state after enabling
        const state = await unifiedStepTrackingService.getSyncState();
        setSyncState(state);
        // Refresh steps store to show synced data
        if (refreshAfterSync) {
          await refreshAfterSync();
        }
      } else if (result.message) {
        setError(result.message);
      }

      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return {
        success: false,
        status: 'not_available',
        message: errorMessage,
      };
    } finally {
      setIsSyncing(false);
    }
  }, [refreshAfterSync]);

  /**
   * Disables health tracking.
   */
  const disable = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setError(null);

    try {
      await unifiedStepTrackingService.disableHealthTracking();
      setIsEnabled(false);
      // Refresh sync state after disabling
      const state = await unifiedStepTrackingService.getSyncState();
      setSyncState(state);
      // Refresh steps store to reflect removed data
      if (refreshAfterSync) {
        await refreshAfterSync();
      }
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshAfterSync]);

  /**
   * Triggers an on-demand sync.
   */
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await unifiedStepTrackingService.syncNow();

      // Refresh sync state after sync
      const state = await unifiedStepTrackingService.getSyncState();
      setSyncState(state);

      if (result.success) {
        // Refresh steps store to show synced data
        if (refreshAfterSync) {
          await refreshAfterSync();
        }
      } else if (result.errors && result.errors.length > 0) {
        setError(result.errors.join(', '));
      }

      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return {
        success: false,
        entriesSynced: 0,
        errors: [errorMessage],
      };
    } finally {
      setIsSyncing(false);
    }
  }, [refreshAfterSync]);

  // Initialize service and load state on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await unifiedStepTrackingService.initialize();
        if (mounted) {
          await refresh();
        }
      } catch (err) {
        if (mounted) {
          setError(getErrorMessage(err));
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [refresh]);

  return {
    isAvailable,
    isEnabled,
    isSyncing,
    syncState,
    error,
    healthSource,
    enable,
    disable,
    syncNow,
    refresh,
  };
}

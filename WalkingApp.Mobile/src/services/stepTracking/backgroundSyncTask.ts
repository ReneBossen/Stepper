import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { unifiedStepTrackingService } from './unifiedStepTrackingService';

/**
 * Unique identifier for the background step sync task.
 * Must be consistent across app restarts.
 */
const BACKGROUND_SYNC_TASK = 'STEP_SYNC_TASK';

/**
 * Minimum interval between background sync executions in minutes.
 * The system may run the task less frequently based on battery, network, and usage patterns.
 * Note: Android has a minimum of 15 minutes; we use 120 (2 hours) for battery efficiency.
 */
const SYNC_INTERVAL_MINUTES = 120;

/**
 * Define the background task at module load time.
 * This must be in the global scope, not inside a React component.
 * The task is defined immediately when this module is imported.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Task started at:', new Date().toISOString());

    // Check if health tracking is enabled
    const isEnabled = await unifiedStepTrackingService.isHealthTrackingEnabled();
    if (!isEnabled) {
      console.log('[BackgroundSync] Health tracking not enabled, skipping sync');
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Ensure the service is initialized
    await unifiedStepTrackingService.initialize();

    // Perform the sync operation
    const result = await unifiedStepTrackingService.syncNow();

    if (result.success) {
      console.log(
        '[BackgroundSync] Sync completed successfully:',
        result.entriesSynced,
        'entries synced'
      );
      return BackgroundTask.BackgroundTaskResult.Success;
    } else {
      console.warn('[BackgroundSync] Sync failed:', result.errors?.join(', '));
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  } catch (error) {
    console.error('[BackgroundSync] Task execution error:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Registers the background sync task with the system.
 * Should be called when health tracking is enabled.
 *
 * The task will run approximately every 2 hours, though the exact timing
 * is controlled by the operating system based on battery, network conditions,
 * and app usage patterns.
 *
 * @returns true if registration succeeded, false otherwise
 */
export async function registerBackgroundSync(): Promise<boolean> {
  try {
    const status = await BackgroundTask.getStatusAsync();

    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      console.log('[BackgroundSync] Background tasks are restricted on this device');
      return false;
    }

    // Register the task with 2-hour minimum interval
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: SYNC_INTERVAL_MINUTES,
    });

    console.log('[BackgroundSync] Task registered successfully with interval:', SYNC_INTERVAL_MINUTES, 'minutes');
    return true;
  } catch (error) {
    console.error('[BackgroundSync] Failed to register task:', error);
    return false;
  }
}

/**
 * Unregisters the background sync task.
 * Should be called when health tracking is disabled.
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('[BackgroundSync] Task unregistered successfully');
    } else {
      console.log('[BackgroundSync] Task was not registered, nothing to unregister');
    }
  } catch (error) {
    console.error('[BackgroundSync] Failed to unregister task:', error);
  }
}

/**
 * Checks if the background sync task is currently registered.
 *
 * @returns true if the task is registered, false otherwise
 */
export async function isBackgroundSyncRegistered(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  } catch {
    return false;
  }
}

/**
 * Gets the current background task availability status.
 *
 * @returns The current status indicating if background tasks are available
 */
export async function getBackgroundSyncStatus(): Promise<BackgroundTask.BackgroundTaskStatus> {
  return BackgroundTask.getStatusAsync();
}

/**
 * Triggers the background sync task manually for testing purposes.
 * Only works in development/debug builds.
 *
 * @returns true if the task was triggered, false if not available (production build)
 */
export async function triggerBackgroundSyncForTesting(): Promise<boolean> {
  try {
    return await BackgroundTask.triggerTaskWorkerForTestingAsync();
  } catch (error) {
    console.error('[BackgroundSync] Failed to trigger test task:', error);
    return false;
  }
}

/**
 * The task name constant exported for external reference.
 */
export const TASK_NAME = BACKGROUND_SYNC_TASK;

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@store/authStore';
import { unifiedStepTrackingService } from '@services/stepTracking/unifiedStepTrackingService';
import {
  isBackgroundSyncRegistered,
  registerBackgroundSync,
} from '@services/stepTracking/backgroundSyncTask';

const AUTO_SYNC_THROTTLE_MS = 60 * 1000;

type SyncTrigger = 'mount' | 'foreground';

/**
 * Silently syncs health data on cold start and whenever the app returns
 * to the foreground. Also self-heals background task registration for
 * users whose task got unregistered (app update, OS cleanup).
 *
 * All errors are logged only. Manual "Sync Now" in Settings keeps its
 * own user-visible error flow via useStepTracking.
 */
export function useAutoHealthSync(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const lastAutoSyncAt = useRef<number>(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    const runAutoSync = async (trigger: SyncTrigger): Promise<void> => {
      const now = Date.now();
      if (now - lastAutoSyncAt.current < AUTO_SYNC_THROTTLE_MS) {
        console.log('[AutoSync] throttled, skipping');
        return;
      }

      try {
        await unifiedStepTrackingService.initialize();
        if (cancelled) return;

        const enabled = await unifiedStepTrackingService.isHealthTrackingEnabled();
        if (!enabled) {
          console.log('[AutoSync] tracking disabled, skipping');
          return;
        }

        const registered = await isBackgroundSyncRegistered();
        if (!registered) {
          console.log('[AutoSync] background task missing, re-registering');
          await registerBackgroundSync();
        }

        if (cancelled) return;

        lastAutoSyncAt.current = now;
        console.log(`[AutoSync] running ${trigger} sync`);
        const result = await unifiedStepTrackingService.syncNow();

        if (result.success) {
          console.log(
            '[AutoSync] sync completed:',
            result.entriesSynced,
            'entries'
          );
        } else {
          console.warn('[AutoSync] sync failed:', result.errors?.join(', '));
        }
      } catch (error) {
        console.warn('[AutoSync] error during sync:', error);
      }
    };

    runAutoSync('mount');

    appState.current = AppState.currentState;
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          runAutoSync('foreground');
        }
        appState.current = nextAppState;
      }
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [isAuthenticated]);
}

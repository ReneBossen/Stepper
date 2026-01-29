// Types
export type {
  AuthorizationStatus,
  HealthSource,
  DailyStepData,
  HealthDataProvider,
  SyncState,
  EnableResult,
  SyncResult,
} from './types';

// Factory functions
export {
  getHealthPlatform,
  createHealthDataProvider,
  getHealthSource,
} from './healthProviderFactory';
export type { HealthPlatform } from './healthProviderFactory';

// Platform-specific services
export { HealthKitService, createHealthKitService } from './healthKitService';
export { GoogleFitService, createGoogleFitService } from './googleFitService';

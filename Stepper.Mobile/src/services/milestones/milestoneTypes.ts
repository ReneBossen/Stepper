/**
 * Milestone type definitions.
 * Provides the type system for the configuration-driven milestone system.
 */

import type { AnalyticsEvent } from '../analytics/analyticsTypes';

// =============================================================================
// Milestone Categories
// =============================================================================

/**
 * Categories for organizing milestones.
 */
export type MilestoneCategory =
  | 'social'
  | 'streak'
  | 'achievement'
  | 'fitness'
  | 'competition';

// =============================================================================
// Milestone Context
// =============================================================================

/**
 * Context provided to milestone evaluators.
 * Contains the current and previous state of metrics.
 */
export interface MilestoneContext {
  /**
   * Current values of all metrics.
   * Keys are metric names (e.g., 'friend_count', 'current_streak').
   */
  currentMetrics: Record<string, number>;

  /**
   * Previous values of metrics before the current change.
   * Used for comparison-based and first-time evaluators.
   */
  previousMetrics: Record<string, number>;

  /**
   * User ID if available.
   */
  userId?: string;
}

// =============================================================================
// Milestone Evaluators
// =============================================================================

/**
 * Threshold evaluator - achieved when metric >= threshold.
 */
export interface ThresholdEvaluator {
  type: 'threshold';
  /**
   * Name of the metric to check (e.g., 'friend_count', 'current_streak').
   */
  metric: string;
  /**
   * Threshold value that must be met or exceeded.
   */
  threshold: number;
}

/**
 * First-time evaluator - achieved when metric goes from 0 to > 0.
 */
export interface FirstTimeEvaluator {
  type: 'first_time';
  /**
   * Name of the metric to check.
   */
  metric: string;
}

/**
 * Comparison evaluator - achieved when current > previous.
 */
export interface ComparisonEvaluator {
  type: 'comparison';
  /**
   * Name of the metric to compare.
   */
  metric: string;
}

/**
 * Custom evaluator - uses a provided function for evaluation.
 */
export interface CustomEvaluator {
  type: 'custom';
  /**
   * Custom evaluation function.
   * @param context - The milestone context with current and previous metrics.
   * @returns true if the milestone is achieved.
   */
  evaluate: (context: MilestoneContext) => boolean;
}

/**
 * Union type of all evaluator types.
 */
export type MilestoneEvaluator =
  | ThresholdEvaluator
  | FirstTimeEvaluator
  | ComparisonEvaluator
  | CustomEvaluator;

// =============================================================================
// Milestone Definition
// =============================================================================

/**
 * Complete definition of a milestone.
 * This is the configuration object used to define milestones in the registry.
 */
export interface MilestoneDefinition {
  /**
   * Unique identifier for the milestone.
   */
  id: string;

  /**
   * Display name for the milestone.
   */
  name: string;

  /**
   * Human-readable description of the milestone.
   */
  description: string;

  /**
   * Category for organizing and filtering milestones.
   */
  category: MilestoneCategory;

  /**
   * Evaluator configuration that determines when the milestone is achieved.
   */
  evaluator: MilestoneEvaluator;

  /**
   * Analytics event to fire when the milestone is achieved.
   */
  event: AnalyticsEvent;

  /**
   * Additional properties to include with the analytics event.
   */
  eventProperties?: Record<string, unknown>;

  /**
   * Whether this milestone can be achieved multiple times.
   * If false, the milestone will only fire once per user.
   * Default: false
   */
  repeatable: boolean;
}

// =============================================================================
// Achieved Milestone
// =============================================================================

/**
 * Record of an achieved milestone.
 */
export interface AchievedMilestone {
  /**
   * The milestone ID that was achieved.
   */
  id: string;

  /**
   * Timestamp when the milestone was achieved.
   */
  achievedAt: Date;

  /**
   * The context at the time of achievement (for debugging/logging).
   */
  context?: MilestoneContext;
}

/**
 * Stored format of achieved milestone for AsyncStorage.
 */
export interface StoredMilestoneAchievement {
  /**
   * The milestone ID.
   */
  milestoneId: string;

  /**
   * ISO string timestamp of when it was achieved.
   */
  achievedAt: string;

  /**
   * Number of times achieved (for repeatable milestones).
   */
  achievementCount: number;
}

// =============================================================================
// Milestone Engine Interface
// =============================================================================

/**
 * Interface for the milestone evaluation engine.
 */
export interface IMilestoneEngine {
  /**
   * Evaluate all milestones against the current context.
   * @param context - The current metrics context.
   * @returns Array of newly achieved milestones.
   */
  evaluate(context: MilestoneContext): Promise<AchievedMilestone[]>;

  /**
   * Check a specific milestone.
   * @param id - The milestone ID to check.
   * @param context - The current metrics context.
   * @returns The achieved milestone or null if not achieved.
   */
  checkMilestone(
    id: string,
    context: MilestoneContext
  ): Promise<AchievedMilestone | null>;

  /**
   * Get all achieved milestones for a user.
   * @param userId - The user ID.
   * @returns Array of stored achievement records.
   */
  getAchievedMilestones(userId: string): Promise<StoredMilestoneAchievement[]>;

  /**
   * Check if a milestone has already been achieved.
   * @param userId - The user ID.
   * @param milestoneId - The milestone ID.
   * @returns true if already achieved.
   */
  isAchieved(userId: string, milestoneId: string): Promise<boolean>;

  /**
   * Reset all achieved milestones for a user.
   * Used for testing or account reset.
   * @param userId - The user ID.
   */
  resetAchievements(userId: string): Promise<void>;

  /**
   * Get all milestone definitions.
   * @returns Array of all registered milestones.
   */
  getAllMilestones(): MilestoneDefinition[];

  /**
   * Get milestones by category.
   * @param category - The category to filter by.
   * @returns Array of milestones in the category.
   */
  getMilestonesByCategory(category: MilestoneCategory): MilestoneDefinition[];
}

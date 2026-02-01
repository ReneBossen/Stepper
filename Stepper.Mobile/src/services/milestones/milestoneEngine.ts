/**
 * Milestone Evaluation Engine.
 *
 * Evaluates milestone definitions against user metrics and tracks achievements.
 * This engine is configuration-driven - adding new milestones requires NO changes
 * to this file, only additions to the milestoneDefinitions registry.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from '../analytics';
import type { AnalyticsEvent, EventPropertiesMap } from '../analytics/analyticsTypes';
import { MILESTONE_DEFINITIONS, getMilestoneById } from './milestoneDefinitions';
import type {
  MilestoneDefinition,
  MilestoneContext,
  MilestoneEvaluator,
  MilestoneCategory,
  AchievedMilestone,
  StoredMilestoneAchievement,
  IMilestoneEngine,
} from './milestoneTypes';

// =============================================================================
// Storage Keys
// =============================================================================

/**
 * Storage key prefix for milestone achievements.
 * Format: milestone_achieved_{userId}_{milestoneId}
 */
const ACHIEVEMENT_KEY_PREFIX = 'milestone_achieved';

/**
 * Storage key for all achievements index (for faster lookups).
 * Format: milestone_index_{userId}
 */
const ACHIEVEMENT_INDEX_PREFIX = 'milestone_index';

/**
 * Generate storage key for a specific milestone achievement.
 */
function getAchievementKey(userId: string, milestoneId: string): string {
  return `${ACHIEVEMENT_KEY_PREFIX}_${userId}_${milestoneId}`;
}

/**
 * Generate storage key for achievement index.
 */
function getIndexKey(userId: string): string {
  return `${ACHIEVEMENT_INDEX_PREFIX}_${userId}`;
}

// =============================================================================
// Evaluator Functions
// =============================================================================

/**
 * Evaluate a threshold-based milestone.
 * Returns true if the current metric value >= threshold.
 */
function evaluateThreshold(
  evaluator: { metric: string; threshold: number },
  context: MilestoneContext
): boolean {
  const currentValue = context.currentMetrics[evaluator.metric] ?? 0;
  return currentValue >= evaluator.threshold;
}

/**
 * Evaluate a first-time milestone.
 * Returns true if metric went from 0 (or undefined) to > 0.
 */
function evaluateFirstTime(
  evaluator: { metric: string },
  context: MilestoneContext
): boolean {
  const previousValue = context.previousMetrics[evaluator.metric] ?? 0;
  const currentValue = context.currentMetrics[evaluator.metric] ?? 0;

  return previousValue === 0 && currentValue > 0;
}

/**
 * Evaluate a comparison-based milestone.
 * Returns true if current value > previous value.
 */
function evaluateComparison(
  evaluator: { metric: string },
  context: MilestoneContext
): boolean {
  const previousValue = context.previousMetrics[evaluator.metric] ?? 0;
  const currentValue = context.currentMetrics[evaluator.metric] ?? 0;

  return currentValue > previousValue;
}

/**
 * Evaluate any milestone evaluator type.
 * Dispatches to the appropriate evaluator function based on type.
 */
function evaluateMilestone(
  evaluator: MilestoneEvaluator,
  context: MilestoneContext
): boolean {
  switch (evaluator.type) {
    case 'threshold':
      return evaluateThreshold(evaluator, context);

    case 'first_time':
      return evaluateFirstTime(evaluator, context);

    case 'comparison':
      return evaluateComparison(evaluator, context);

    case 'custom':
      return evaluator.evaluate(context);

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = evaluator;
      console.warn('[MilestoneEngine] Unknown evaluator type:', _exhaustive);
      return false;
  }
}

// =============================================================================
// Storage Functions
// =============================================================================

/**
 * Load achievement from storage.
 */
async function loadAchievement(
  userId: string,
  milestoneId: string
): Promise<StoredMilestoneAchievement | null> {
  try {
    const key = getAchievementKey(userId, milestoneId);
    const data = await AsyncStorage.getItem(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as StoredMilestoneAchievement;
  } catch (error) {
    console.error('[MilestoneEngine] Failed to load achievement:', error);
    return null;
  }
}

/**
 * Save achievement to storage.
 */
async function saveAchievement(
  userId: string,
  achievement: StoredMilestoneAchievement
): Promise<void> {
  try {
    const key = getAchievementKey(userId, achievement.milestoneId);
    await AsyncStorage.setItem(key, JSON.stringify(achievement));

    // Update the index
    await addToIndex(userId, achievement.milestoneId);
  } catch (error) {
    console.error('[MilestoneEngine] Failed to save achievement:', error);
  }
}

/**
 * Add a milestone ID to the user's achievement index.
 */
async function addToIndex(userId: string, milestoneId: string): Promise<void> {
  try {
    const indexKey = getIndexKey(userId);
    const indexData = await AsyncStorage.getItem(indexKey);
    const index: string[] = indexData ? JSON.parse(indexData) : [];

    if (!index.includes(milestoneId)) {
      index.push(milestoneId);
      await AsyncStorage.setItem(indexKey, JSON.stringify(index));
    }
  } catch (error) {
    console.error('[MilestoneEngine] Failed to update index:', error);
  }
}

/**
 * Load all achievement IDs for a user.
 */
async function loadAchievementIndex(userId: string): Promise<string[]> {
  try {
    const indexKey = getIndexKey(userId);
    const indexData = await AsyncStorage.getItem(indexKey);
    return indexData ? JSON.parse(indexData) : [];
  } catch (error) {
    console.error('[MilestoneEngine] Failed to load index:', error);
    return [];
  }
}

// =============================================================================
// Analytics Integration
// =============================================================================

/**
 * Fire the analytics event for a milestone achievement.
 */
function fireAnalyticsEvent(
  milestone: MilestoneDefinition,
  context: MilestoneContext
): void {
  const event = milestone.event as AnalyticsEvent;
  const properties = {
    milestone_id: milestone.id,
    milestone_name: milestone.name,
    milestone_category: milestone.category,
    ...milestone.eventProperties,
  } as EventPropertiesMap[typeof event];

  track(event, properties);

  if (__DEV__) {
    console.log(`[MilestoneEngine] Fired event: ${event}`, properties);
  }
}

// =============================================================================
// Milestone Engine Implementation
// =============================================================================

/**
 * Evaluate all milestones against the current context.
 * Returns an array of newly achieved milestones.
 *
 * @param context - The current metrics context.
 * @returns Array of newly achieved milestones.
 */
export async function evaluate(
  context: MilestoneContext
): Promise<AchievedMilestone[]> {
  const achieved: AchievedMilestone[] = [];
  const userId = context.userId;

  if (!userId) {
    console.warn('[MilestoneEngine] No userId provided, skipping evaluation');
    return achieved;
  }

  for (const milestone of MILESTONE_DEFINITIONS) {
    // Check if milestone is achieved based on evaluator
    const isAchieved = evaluateMilestone(milestone.evaluator, context);

    if (!isAchieved) {
      continue;
    }

    // Load existing achievement once (atomic read-modify-write pattern)
    const existingAchievement = await loadAchievement(userId, milestone.id);

    // For non-repeatable milestones, skip if already achieved
    if (!milestone.repeatable && existingAchievement) {
      continue;
    }

    // Milestone is newly achieved
    const achievedAt = new Date();

    // Persist the achievement
    const stored: StoredMilestoneAchievement = {
      milestoneId: milestone.id,
      achievedAt: achievedAt.toISOString(),
      achievementCount: (existingAchievement?.achievementCount ?? 0) + 1,
    };

    await saveAchievement(userId, stored);

    // Fire the analytics event
    fireAnalyticsEvent(milestone, context);

    // Add to the result
    achieved.push({
      id: milestone.id,
      achievedAt,
      context,
    });

    if (__DEV__) {
      console.log(`[MilestoneEngine] Milestone achieved: ${milestone.name}`);
    }
  }

  return achieved;
}

/**
 * Check a specific milestone against the context.
 *
 * @param id - The milestone ID to check.
 * @param context - The current metrics context.
 * @returns The achieved milestone or null if not achieved.
 */
export async function checkMilestone(
  id: string,
  context: MilestoneContext
): Promise<AchievedMilestone | null> {
  const milestone = getMilestoneById(id);

  if (!milestone) {
    console.warn(`[MilestoneEngine] Milestone not found: ${id}`);
    return null;
  }

  const userId = context.userId;
  if (!userId) {
    console.warn('[MilestoneEngine] No userId provided');
    return null;
  }

  // Check if milestone is achieved
  const isAchieved = evaluateMilestone(milestone.evaluator, context);

  if (!isAchieved) {
    return null;
  }

  // Load existing achievement once (atomic read-modify-write pattern)
  const existingAchievement = await loadAchievement(userId, milestone.id);

  // For non-repeatable milestones, skip if already achieved
  if (!milestone.repeatable && existingAchievement) {
    return null;
  }

  // Milestone is newly achieved
  const achievedAt = new Date();

  const stored: StoredMilestoneAchievement = {
    milestoneId: milestone.id,
    achievedAt: achievedAt.toISOString(),
    achievementCount: (existingAchievement?.achievementCount ?? 0) + 1,
  };

  await saveAchievement(userId, stored);
  fireAnalyticsEvent(milestone, context);

  return {
    id: milestone.id,
    achievedAt,
    context,
  };
}

/**
 * Get all achieved milestones for a user.
 *
 * @param userId - The user ID.
 * @returns Array of stored achievement records.
 */
export async function getAchievedMilestones(
  userId: string
): Promise<StoredMilestoneAchievement[]> {
  const achievements: StoredMilestoneAchievement[] = [];
  const index = await loadAchievementIndex(userId);

  for (const milestoneId of index) {
    const achievement = await loadAchievement(userId, milestoneId);
    if (achievement) {
      achievements.push(achievement);
    }
  }

  return achievements;
}

/**
 * Check if a milestone has already been achieved by a user.
 *
 * @param userId - The user ID.
 * @param milestoneId - The milestone ID.
 * @returns true if the milestone has been achieved.
 */
export async function isAchieved(
  userId: string,
  milestoneId: string
): Promise<boolean> {
  const achievement = await loadAchievement(userId, milestoneId);
  return achievement !== null;
}

/**
 * Reset all achieved milestones for a user.
 * Used for testing or account reset.
 *
 * @param userId - The user ID.
 */
export async function resetAchievements(userId: string): Promise<void> {
  try {
    const index = await loadAchievementIndex(userId);

    // Remove all achievement records
    const keysToRemove = index.map((milestoneId) =>
      getAchievementKey(userId, milestoneId)
    );
    keysToRemove.push(getIndexKey(userId));

    await AsyncStorage.multiRemove(keysToRemove);

    if (__DEV__) {
      console.log(
        `[MilestoneEngine] Reset ${index.length} achievements for user: ${userId}`
      );
    }
  } catch (error) {
    console.error('[MilestoneEngine] Failed to reset achievements:', error);
  }
}

/**
 * Get all milestone definitions.
 *
 * @returns Array of all registered milestones.
 */
export function getAllMilestones(): MilestoneDefinition[] {
  return [...MILESTONE_DEFINITIONS];
}

/**
 * Get milestones by category.
 *
 * @param category - The category to filter by.
 * @returns Array of milestones in the category.
 */
export function getMilestonesByCategory(
  category: MilestoneCategory
): MilestoneDefinition[] {
  return MILESTONE_DEFINITIONS.filter((m) => m.category === category);
}

/**
 * Persist an achievement directly (for manual or external achievement).
 * This is useful when achievements are determined outside the normal evaluation flow.
 *
 * @param userId - The user ID.
 * @param milestoneId - The milestone ID.
 * @returns true if the achievement was persisted.
 */
export async function persistAchievement(
  userId: string,
  milestoneId: string
): Promise<boolean> {
  const milestone = getMilestoneById(milestoneId);

  if (!milestone) {
    console.warn(`[MilestoneEngine] Milestone not found: ${milestoneId}`);
    return false;
  }

  // Load existing achievement once (atomic read-modify-write pattern)
  const existingAchievement = await loadAchievement(userId, milestoneId);

  // For non-repeatable, skip if already achieved
  if (!milestone.repeatable && existingAchievement) {
    return false;
  }

  const stored: StoredMilestoneAchievement = {
    milestoneId,
    achievedAt: new Date().toISOString(),
    achievementCount: (existingAchievement?.achievementCount ?? 0) + 1,
  };

  await saveAchievement(userId, stored);
  return true;
}

/**
 * The milestone engine object implementing IMilestoneEngine interface.
 */
export const milestoneEngine: IMilestoneEngine = {
  evaluate,
  checkMilestone,
  getAchievedMilestones,
  isAchieved,
  resetAchievements,
  getAllMilestones,
  getMilestonesByCategory,
};

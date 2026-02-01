/**
 * Milestone definitions registry.
 *
 * This is the central configuration for all milestones in the app.
 * To add a new milestone, simply add a new definition to the MILESTONE_DEFINITIONS array.
 * NO changes to the engine code are required.
 *
 * @example Adding a new milestone
 * ```typescript
 * {
 *   id: 'step_master',
 *   name: 'Step Master',
 *   description: 'Reached 1 million lifetime steps',
 *   category: 'fitness',
 *   evaluator: { type: 'threshold', metric: 'total_steps_lifetime', threshold: 1_000_000 },
 *   event: 'personal_best_achieved',
 *   eventProperties: { milestone_type: 'lifetime_steps', threshold: 1_000_000 },
 *   repeatable: false
 * }
 * ```
 */

import type { MilestoneDefinition } from './milestoneTypes';

/**
 * Registry of all milestone definitions.
 * This array is the single source of truth for all milestones.
 */
export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // ===========================================================================
  // Social Milestones
  // ===========================================================================

  {
    id: 'first_friend',
    name: 'First Friend',
    description: 'Added your first friend',
    category: 'social',
    evaluator: {
      type: 'first_time',
      metric: 'friend_count',
    },
    event: 'first_friend_added',
    repeatable: false,
  },

  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Connected with 3 friends',
    category: 'social',
    evaluator: {
      type: 'threshold',
      metric: 'friend_count',
      threshold: 3,
    },
    event: 'social_threshold_reached',
    eventProperties: {
      threshold: 3,
      milestone_name: 'social_butterfly',
    },
    repeatable: false,
  },

  {
    id: 'social_network',
    name: 'Social Network',
    description: 'Connected with 10 friends',
    category: 'social',
    evaluator: {
      type: 'threshold',
      metric: 'friend_count',
      threshold: 10,
    },
    event: 'social_threshold_reached',
    eventProperties: {
      threshold: 10,
      milestone_name: 'social_network',
    },
    repeatable: false,
  },

  {
    id: 'first_group',
    name: 'First Group',
    description: 'Joined your first group',
    category: 'social',
    evaluator: {
      type: 'first_time',
      metric: 'group_count',
    },
    event: 'first_group_joined',
    repeatable: false,
  },

  // ===========================================================================
  // Streak Milestones
  // ===========================================================================

  {
    id: 'streak_3',
    name: '3 Day Streak',
    description: 'Maintained a 3 day activity streak',
    category: 'streak',
    evaluator: {
      type: 'threshold',
      metric: 'current_streak',
      threshold: 3,
    },
    event: 'streak_milestone',
    eventProperties: {
      streak_days: 3,
      milestone: 3,
    },
    repeatable: false,
  },

  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintained a 7 day activity streak',
    category: 'streak',
    evaluator: {
      type: 'threshold',
      metric: 'current_streak',
      threshold: 7,
    },
    event: 'streak_milestone',
    eventProperties: {
      streak_days: 7,
      milestone: 7,
    },
    repeatable: false,
  },

  {
    id: 'streak_14',
    name: 'Two Week Champion',
    description: 'Maintained a 14 day activity streak',
    category: 'streak',
    evaluator: {
      type: 'threshold',
      metric: 'current_streak',
      threshold: 14,
    },
    event: 'streak_milestone',
    eventProperties: {
      streak_days: 14,
      milestone: 14,
    },
    repeatable: false,
  },

  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintained a 30 day activity streak',
    category: 'streak',
    evaluator: {
      type: 'threshold',
      metric: 'current_streak',
      threshold: 30,
    },
    event: 'streak_milestone',
    eventProperties: {
      streak_days: 30,
      milestone: 30,
    },
    repeatable: false,
  },

  {
    id: 'streak_60',
    name: 'Consistency King',
    description: 'Maintained a 60 day activity streak',
    category: 'streak',
    evaluator: {
      type: 'threshold',
      metric: 'current_streak',
      threshold: 60,
    },
    event: 'streak_milestone',
    eventProperties: {
      streak_days: 60,
      milestone: 60,
    },
    repeatable: false,
  },

  {
    id: 'streak_90',
    name: 'Unstoppable',
    description: 'Maintained a 90 day activity streak',
    category: 'streak',
    evaluator: {
      type: 'threshold',
      metric: 'current_streak',
      threshold: 90,
    },
    event: 'streak_milestone',
    eventProperties: {
      streak_days: 90,
      milestone: 90,
    },
    repeatable: false,
  },
];

/**
 * Get a milestone definition by ID.
 * @param id - The milestone ID.
 * @returns The milestone definition or undefined if not found.
 */
export function getMilestoneById(id: string): MilestoneDefinition | undefined {
  return MILESTONE_DEFINITIONS.find((m) => m.id === id);
}

/**
 * Get all milestone IDs.
 * @returns Array of all milestone IDs.
 */
export function getAllMilestoneIds(): string[] {
  return MILESTONE_DEFINITIONS.map((m) => m.id);
}

/**
 * Get the count of milestones by category.
 * @returns Record of category to count.
 */
export function getMilestoneCountByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const milestone of MILESTONE_DEFINITIONS) {
    counts[milestone.category] = (counts[milestone.category] ?? 0) + 1;
  }

  return counts;
}

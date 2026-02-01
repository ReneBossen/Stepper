/**
 * Milestone system public exports.
 * Provides the main interface for milestone tracking functionality.
 */

// Core milestone engine
export {
  evaluate,
  checkMilestone,
  getAchievedMilestones,
  isAchieved,
  resetAchievements,
  getAllMilestones,
  getMilestonesByCategory,
  persistAchievement,
  milestoneEngine,
} from './milestoneEngine';

// Milestone definitions
export {
  MILESTONE_DEFINITIONS,
  getMilestoneById,
  getAllMilestoneIds,
  getMilestoneCountByCategory,
} from './milestoneDefinitions';

// Types
export type {
  // Category
  MilestoneCategory,

  // Context
  MilestoneContext,

  // Evaluators
  MilestoneEvaluator,
  ThresholdEvaluator,
  FirstTimeEvaluator,
  ComparisonEvaluator,
  CustomEvaluator,

  // Definition
  MilestoneDefinition,

  // Achievement records
  AchievedMilestone,
  StoredMilestoneAchievement,

  // Engine interface
  IMilestoneEngine,
} from './milestoneTypes';

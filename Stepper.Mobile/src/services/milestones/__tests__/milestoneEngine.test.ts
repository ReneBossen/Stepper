/**
 * Unit tests for the Milestone Evaluation Engine.
 * Tests evaluator types, achievement persistence, and analytics integration.
 */

// Define __DEV__ global for React Native
declare const global: {
  __DEV__: boolean;
} & typeof globalThis;
global.__DEV__ = true;

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as analyticsService from '../../analytics';
import type {
  MilestoneContext,
  MilestoneDefinition,
  MilestoneCategory,
} from '../milestoneTypes';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../../analytics', () => ({
  track: jest.fn(),
}));

// We need to track our test milestones
let testMilestones: MilestoneDefinition[] = [];

// Mock milestone definitions module
jest.mock('../milestoneDefinitions', () => ({
  get MILESTONE_DEFINITIONS() {
    return testMilestones;
  },
  getMilestoneById: jest.fn((id: string) => testMilestones.find((m) => m.id === id)),
  getAllMilestoneIds: jest.fn(() => testMilestones.map((m) => m.id)),
  getMilestoneCountByCategory: jest.fn(() => {
    const counts: Record<string, number> = {};
    for (const milestone of testMilestones) {
      counts[milestone.category] = (counts[milestone.category] ?? 0) + 1;
    }
    return counts;
  }),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockAnalyticsTrack = analyticsService.track as jest.Mock;

// Import after mocks are set up
import * as milestoneEngine from '../milestoneEngine';
import { getMilestoneById } from '../milestoneDefinitions';

const mockGetMilestoneById = getMilestoneById as jest.MockedFunction<typeof getMilestoneById>;

describe('milestoneEngine', () => {
  const mockUserId = 'user-test-123';

  // Helper to create context
  function createContext(
    current: Record<string, number>,
    previous: Record<string, number> = {}
  ): MilestoneContext {
    return {
      userId: mockUserId,
      currentMetrics: current,
      previousMetrics: previous,
    };
  }

  // Helper to create milestone definition
  function createMilestoneDefinition(
    overrides: Partial<MilestoneDefinition> = {}
  ): MilestoneDefinition {
    return {
      id: 'test-milestone',
      name: 'Test Milestone',
      description: 'A test milestone',
      category: 'achievement' as MilestoneCategory,
      evaluator: { type: 'threshold', metric: 'test_metric', threshold: 10 },
      event: 'daily_goal_achieved',
      repeatable: false,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.multiRemove.mockResolvedValue(undefined);

    // Reset test milestones
    testMilestones = [];
  });

  describe('threshold evaluator', () => {
    it('should achieve milestone when metric >= threshold', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'threshold_test',
          evaluator: { type: 'threshold', metric: 'friend_count', threshold: 3 },
          event: 'social_threshold_reached',
        })
      );

      const context = createContext({ friend_count: 5 });
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(1);
      expect(achieved[0].id).toBe('threshold_test');
    });

    it('should achieve milestone when metric equals threshold', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'exact_threshold',
          evaluator: { type: 'threshold', metric: 'friend_count', threshold: 3 },
          event: 'social_threshold_reached',
        })
      );

      const context = createContext({ friend_count: 3 });
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(1);
    });

    it('should not achieve milestone when metric < threshold', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'below_threshold',
          evaluator: { type: 'threshold', metric: 'friend_count', threshold: 3 },
          event: 'social_threshold_reached',
        })
      );

      const context = createContext({ friend_count: 2 });
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(0);
    });

    it('should handle missing metric as zero', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'missing_metric',
          evaluator: { type: 'threshold', metric: 'nonexistent', threshold: 1 },
          event: 'daily_goal_achieved',
        })
      );

      const context = createContext({});
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(0);
    });
  });

  describe('first_time evaluator', () => {
    it('should achieve milestone when metric goes from 0 to > 0', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'first_time_test',
          evaluator: { type: 'first_time', metric: 'friend_count' },
          event: 'first_friend_added',
        })
      );

      const context = createContext(
        { friend_count: 1 },
        { friend_count: 0 }
      );
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(1);
      expect(achieved[0].id).toBe('first_time_test');
    });

    it('should achieve milestone when previous metric is undefined', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'first_time_undefined',
          evaluator: { type: 'first_time', metric: 'friend_count' },
          event: 'first_friend_added',
        })
      );

      const context = createContext(
        { friend_count: 1 },
        {} // No previous metric
      );
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(1);
    });

    it('should not achieve milestone when previous metric > 0', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'not_first_time',
          evaluator: { type: 'first_time', metric: 'friend_count' },
          event: 'first_friend_added',
        })
      );

      const context = createContext(
        { friend_count: 2 },
        { friend_count: 1 }
      );
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(0);
    });

    it('should not achieve milestone when current metric is 0', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'still_zero',
          evaluator: { type: 'first_time', metric: 'friend_count' },
          event: 'first_friend_added',
        })
      );

      const context = createContext(
        { friend_count: 0 },
        { friend_count: 0 }
      );
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(0);
    });
  });

  describe('comparison evaluator', () => {
    it('should achieve milestone when current > previous', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'comparison_test',
          evaluator: { type: 'comparison', metric: 'daily_steps' },
          event: 'personal_best_achieved',
        })
      );

      const context = createContext(
        { daily_steps: 15000 },
        { daily_steps: 10000 }
      );
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(1);
    });

    it('should not achieve milestone when current <= previous', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'no_improvement',
          evaluator: { type: 'comparison', metric: 'daily_steps' },
          event: 'personal_best_achieved',
        })
      );

      const context = createContext(
        { daily_steps: 10000 },
        { daily_steps: 10000 }
      );
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(0);
    });

    it('should not achieve milestone when current < previous', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'decrease',
          evaluator: { type: 'comparison', metric: 'daily_steps' },
          event: 'personal_best_achieved',
        })
      );

      const context = createContext(
        { daily_steps: 8000 },
        { daily_steps: 10000 }
      );
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(0);
    });
  });

  describe('custom evaluator', () => {
    it('should use custom function for evaluation', async () => {
      const customEvaluate = jest.fn().mockReturnValue(true);
      testMilestones.push(
        createMilestoneDefinition({
          id: 'custom_test',
          evaluator: { type: 'custom', evaluate: customEvaluate },
          event: 'daily_goal_achieved',
        })
      );

      const context = createContext({ some_metric: 100 });
      const achieved = await milestoneEngine.evaluate(context);

      expect(customEvaluate).toHaveBeenCalledWith(context);
      expect(achieved.length).toBe(1);
    });

    it('should not achieve when custom function returns false', async () => {
      const customEvaluate = jest.fn().mockReturnValue(false);
      testMilestones.push(
        createMilestoneDefinition({
          id: 'custom_false',
          evaluator: { type: 'custom', evaluate: customEvaluate },
          event: 'daily_goal_achieved',
        })
      );

      const context = createContext({});
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(0);
    });
  });

  describe('non-repeatable milestones', () => {
    it('should not fire again when already achieved', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'non_repeatable',
          repeatable: false,
          evaluator: { type: 'threshold', metric: 'friend_count', threshold: 3 },
          event: 'social_threshold_reached',
        })
      );

      // Mock that milestone was already achieved
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          milestoneId: 'non_repeatable',
          achievedAt: '2024-01-15T10:00:00.000Z',
          achievementCount: 1,
        })
      );

      const context = createContext({ friend_count: 5 });
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(0);
    });

    it('should fire once for first achievement', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'first_achievement',
          repeatable: false,
          evaluator: { type: 'threshold', metric: 'friend_count', threshold: 1 },
          event: 'first_friend_added',
        })
      );

      const context = createContext({ friend_count: 1 });
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(1);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('repeatable milestones', () => {
    it('should fire at each achievement', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'repeatable_milestone',
          repeatable: true,
          evaluator: { type: 'comparison', metric: 'daily_steps' },
          event: 'personal_best_achieved',
        })
      );

      // Mock existing achievement - first call returns existing, second call for update
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(
          JSON.stringify({
            milestoneId: 'repeatable_milestone',
            achievedAt: '2024-01-15T10:00:00.000Z',
            achievementCount: 1,
          })
        )
        .mockResolvedValueOnce('[]'); // Index

      const context = createContext(
        { daily_steps: 20000 },
        { daily_steps: 15000 }
      );
      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(1);
    });

    it('should increment achievement count', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'repeatable_increment',
          repeatable: true,
          evaluator: { type: 'comparison', metric: 'daily_steps' },
          event: 'personal_best_achieved',
        })
      );

      // Mock: first call for existing achievement check (returns previous)
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(
          JSON.stringify({
            milestoneId: 'repeatable_increment',
            achievedAt: '2024-01-15T10:00:00.000Z',
            achievementCount: 2,
          })
        )
        .mockResolvedValueOnce('["repeatable_increment"]'); // Index

      const context = createContext(
        { daily_steps: 20000 },
        { daily_steps: 15000 }
      );
      await milestoneEngine.evaluate(context);

      // Check that setItem was called
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('achievement persistence', () => {
    it('should save achievement to AsyncStorage', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'persist_test',
          evaluator: { type: 'threshold', metric: 'friend_count', threshold: 1 },
          event: 'first_friend_added',
        })
      );

      const context = createContext({ friend_count: 1 });
      await milestoneEngine.evaluate(context);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `milestone_achieved_${mockUserId}_persist_test`,
        expect.stringContaining('persist_test')
      );
    });

    it('should update achievement index', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'index_test',
          evaluator: { type: 'threshold', metric: 'friend_count', threshold: 1 },
          event: 'first_friend_added',
        })
      );

      mockAsyncStorage.getItem.mockResolvedValue(null);

      const context = createContext({ friend_count: 1 });
      await milestoneEngine.evaluate(context);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `milestone_index_${mockUserId}`,
        expect.any(String)
      );
    });
  });

  describe('analytics event firing', () => {
    it('should fire analytics event on achievement', async () => {
      testMilestones.push(
        createMilestoneDefinition({
          id: 'analytics_test',
          evaluator: { type: 'threshold', metric: 'current_streak', threshold: 7 },
          event: 'streak_milestone',
          eventProperties: { streak_days: 7, milestone: 7 },
        })
      );

      const context = createContext({ current_streak: 7 });
      await milestoneEngine.evaluate(context);

      expect(mockAnalyticsTrack).toHaveBeenCalledWith(
        'streak_milestone',
        expect.objectContaining({
          milestone_id: 'analytics_test',
          milestone_name: 'Test Milestone',
          milestone_category: 'achievement',
          streak_days: 7,
          milestone: 7,
        })
      );
    });
  });

  describe('evaluate with no userId', () => {
    it('should skip evaluation when no userId provided', async () => {
      testMilestones.push(createMilestoneDefinition());

      const context: MilestoneContext = {
        currentMetrics: { test_metric: 20 },
        previousMetrics: {},
      };

      const achieved = await milestoneEngine.evaluate(context);

      expect(achieved.length).toBe(0);
    });
  });

  describe('checkMilestone', () => {
    it('should check a specific milestone by ID', async () => {
      const milestone = createMilestoneDefinition({
        id: 'specific_check',
        evaluator: { type: 'threshold', metric: 'friend_count', threshold: 1 },
        event: 'first_friend_added',
      });
      testMilestones.push(milestone);
      mockGetMilestoneById.mockReturnValue(milestone);

      const context = createContext({ friend_count: 1 });
      const achieved = await milestoneEngine.checkMilestone('specific_check', context);

      expect(achieved).not.toBeNull();
      expect(achieved?.id).toBe('specific_check');
    });

    it('should return null when milestone not found', async () => {
      mockGetMilestoneById.mockReturnValue(undefined);

      const context = createContext({ friend_count: 1 });
      const achieved = await milestoneEngine.checkMilestone('nonexistent', context);

      expect(achieved).toBeNull();
    });

    it('should return null when userId not provided', async () => {
      const milestone = createMilestoneDefinition();
      mockGetMilestoneById.mockReturnValue(milestone);

      const context: MilestoneContext = {
        currentMetrics: { test_metric: 20 },
        previousMetrics: {},
      };

      const achieved = await milestoneEngine.checkMilestone('test', context);

      expect(achieved).toBeNull();
    });
  });

  describe('getAchievedMilestones', () => {
    it('should return all achieved milestones for a user', async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('["milestone1", "milestone2"]')
        .mockResolvedValueOnce(
          JSON.stringify({
            milestoneId: 'milestone1',
            achievedAt: '2024-01-15T10:00:00.000Z',
            achievementCount: 1,
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            milestoneId: 'milestone2',
            achievedAt: '2024-01-16T10:00:00.000Z',
            achievementCount: 1,
          })
        );

      const achievements = await milestoneEngine.getAchievedMilestones(mockUserId);

      expect(achievements.length).toBe(2);
      expect(achievements[0].milestoneId).toBe('milestone1');
      expect(achievements[1].milestoneId).toBe('milestone2');
    });

    it('should return empty array when no achievements', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const achievements = await milestoneEngine.getAchievedMilestones(mockUserId);

      expect(achievements).toEqual([]);
    });
  });

  describe('isAchieved', () => {
    it('should return true when milestone is achieved', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          milestoneId: 'test',
          achievedAt: '2024-01-15T10:00:00.000Z',
          achievementCount: 1,
        })
      );

      const result = await milestoneEngine.isAchieved(mockUserId, 'test');

      expect(result).toBe(true);
    });

    it('should return false when milestone is not achieved', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await milestoneEngine.isAchieved(mockUserId, 'test');

      expect(result).toBe(false);
    });
  });

  describe('resetAchievements', () => {
    it('should remove all achievements for a user', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('["milestone1", "milestone2"]');

      await milestoneEngine.resetAchievements(mockUserId);

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        `milestone_achieved_${mockUserId}_milestone1`,
        `milestone_achieved_${mockUserId}_milestone2`,
        `milestone_index_${mockUserId}`,
      ]);
    });

    it('should handle empty achievements gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await milestoneEngine.resetAchievements(mockUserId);

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        `milestone_index_${mockUserId}`,
      ]);
    });
  });

  describe('getAllMilestones', () => {
    it('should return all milestone definitions', () => {
      testMilestones.push(
        createMilestoneDefinition({ id: 'm1' }),
        createMilestoneDefinition({ id: 'm2' })
      );

      const result = milestoneEngine.getAllMilestones();

      expect(result.length).toBe(2);
    });
  });

  describe('getMilestonesByCategory', () => {
    it('should filter milestones by category', () => {
      testMilestones.push(
        createMilestoneDefinition({ id: 'm1', category: 'social' }),
        createMilestoneDefinition({ id: 'm2', category: 'streak' }),
        createMilestoneDefinition({ id: 'm3', category: 'social' })
      );

      const result = milestoneEngine.getMilestonesByCategory('social');

      expect(result.length).toBe(2);
      expect(result.every((m) => m.category === 'social')).toBe(true);
    });
  });

  describe('persistAchievement', () => {
    it('should persist achievement manually', async () => {
      const milestone = createMilestoneDefinition({ id: 'manual_persist' });
      testMilestones.push(milestone);
      mockGetMilestoneById.mockReturnValue(milestone);

      const result = await milestoneEngine.persistAchievement(mockUserId, 'manual_persist');

      expect(result).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should return false for unknown milestone', async () => {
      mockGetMilestoneById.mockReturnValue(undefined);

      const result = await milestoneEngine.persistAchievement(mockUserId, 'unknown');

      expect(result).toBe(false);
    });

    it('should return false for non-repeatable already achieved', async () => {
      const milestone = createMilestoneDefinition({
        id: 'already_done',
        repeatable: false,
      });
      testMilestones.push(milestone);
      mockGetMilestoneById.mockReturnValue(milestone);
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          milestoneId: 'already_done',
          achievedAt: '2024-01-15T10:00:00.000Z',
          achievementCount: 1,
        })
      );

      const result = await milestoneEngine.persistAchievement(mockUserId, 'already_done');

      expect(result).toBe(false);
    });
  });

  describe('milestoneEngine object', () => {
    it('should export all required methods', () => {
      expect(milestoneEngine.milestoneEngine).toBeDefined();
      expect(milestoneEngine.milestoneEngine.evaluate).toBeDefined();
      expect(milestoneEngine.milestoneEngine.checkMilestone).toBeDefined();
      expect(milestoneEngine.milestoneEngine.getAchievedMilestones).toBeDefined();
      expect(milestoneEngine.milestoneEngine.isAchieved).toBeDefined();
      expect(milestoneEngine.milestoneEngine.resetAchievements).toBeDefined();
      expect(milestoneEngine.milestoneEngine.getAllMilestones).toBeDefined();
      expect(milestoneEngine.milestoneEngine.getMilestonesByCategory).toBeDefined();
    });
  });
});

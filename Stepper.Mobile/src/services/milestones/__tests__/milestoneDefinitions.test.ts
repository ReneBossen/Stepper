/**
 * Unit tests for Milestone Definitions.
 * Validates that all milestone definitions have required fields and valid configurations.
 */

import {
  MILESTONE_DEFINITIONS,
  getMilestoneById,
  getAllMilestoneIds,
  getMilestoneCountByCategory,
} from '../milestoneDefinitions';
import type { MilestoneDefinition, MilestoneCategory } from '../milestoneTypes';

// Import analytics types to validate event names
import type { AnalyticsEvent } from '../../analytics/analyticsTypes';

// Valid analytics events for milestones
const VALID_MILESTONE_EVENTS: AnalyticsEvent[] = [
  'first_friend_added',
  'social_threshold_reached',
  'first_group_joined',
  'streak_milestone',
  'personal_best_achieved',
  'daily_goal_achieved',
];

// Valid milestone categories
const VALID_CATEGORIES: MilestoneCategory[] = [
  'social',
  'streak',
  'achievement',
  'fitness',
  'competition',
];

describe('milestoneDefinitions', () => {
  describe('MILESTONE_DEFINITIONS array', () => {
    it('should have at least one milestone defined', () => {
      expect(MILESTONE_DEFINITIONS.length).toBeGreaterThan(0);
    });

    it('should have unique IDs for all milestones', () => {
      const ids = MILESTONE_DEFINITIONS.map((m) => m.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    describe('each milestone', () => {
      MILESTONE_DEFINITIONS.forEach((milestone) => {
        describe(`milestone: ${milestone.id}`, () => {
          it('should have a non-empty id', () => {
            expect(milestone.id).toBeDefined();
            expect(typeof milestone.id).toBe('string');
            expect(milestone.id.length).toBeGreaterThan(0);
          });

          it('should have a non-empty name', () => {
            expect(milestone.name).toBeDefined();
            expect(typeof milestone.name).toBe('string');
            expect(milestone.name.length).toBeGreaterThan(0);
          });

          it('should have a non-empty description', () => {
            expect(milestone.description).toBeDefined();
            expect(typeof milestone.description).toBe('string');
            expect(milestone.description.length).toBeGreaterThan(0);
          });

          it('should have a valid category', () => {
            expect(milestone.category).toBeDefined();
            expect(VALID_CATEGORIES).toContain(milestone.category);
          });

          it('should have a valid evaluator', () => {
            expect(milestone.evaluator).toBeDefined();
            expect(milestone.evaluator.type).toBeDefined();
            expect(['threshold', 'first_time', 'comparison', 'custom']).toContain(
              milestone.evaluator.type
            );
          });

          it('should have a valid event name', () => {
            expect(milestone.event).toBeDefined();
            expect(typeof milestone.event).toBe('string');
            // Event should be a valid analytics event
            expect(VALID_MILESTONE_EVENTS).toContain(milestone.event);
          });

          it('should have a boolean repeatable flag', () => {
            expect(milestone.repeatable).toBeDefined();
            expect(typeof milestone.repeatable).toBe('boolean');
          });

          // Evaluator-specific validations
          if (milestone.evaluator.type === 'threshold') {
            it('should have valid threshold evaluator configuration', () => {
              const evaluator = milestone.evaluator as {
                type: 'threshold';
                metric: string;
                threshold: number;
              };
              expect(evaluator.metric).toBeDefined();
              expect(typeof evaluator.metric).toBe('string');
              expect(evaluator.threshold).toBeDefined();
              expect(typeof evaluator.threshold).toBe('number');
              expect(evaluator.threshold).toBeGreaterThan(0);
            });
          }

          if (milestone.evaluator.type === 'first_time') {
            it('should have valid first_time evaluator configuration', () => {
              const evaluator = milestone.evaluator as {
                type: 'first_time';
                metric: string;
              };
              expect(evaluator.metric).toBeDefined();
              expect(typeof evaluator.metric).toBe('string');
            });
          }

          if (milestone.evaluator.type === 'comparison') {
            it('should have valid comparison evaluator configuration', () => {
              const evaluator = milestone.evaluator as {
                type: 'comparison';
                metric: string;
              };
              expect(evaluator.metric).toBeDefined();
              expect(typeof evaluator.metric).toBe('string');
            });
          }

          if (milestone.evaluator.type === 'custom') {
            it('should have a custom evaluate function', () => {
              const evaluator = milestone.evaluator as {
                type: 'custom';
                evaluate: Function;
              };
              expect(evaluator.evaluate).toBeDefined();
              expect(typeof evaluator.evaluate).toBe('function');
            });
          }
        });
      });
    });
  });

  describe('social milestones', () => {
    it('should include first_friend milestone', () => {
      const firstFriend = MILESTONE_DEFINITIONS.find((m) => m.id === 'first_friend');

      expect(firstFriend).toBeDefined();
      expect(firstFriend?.category).toBe('social');
      expect(firstFriend?.evaluator.type).toBe('first_time');
      expect(firstFriend?.event).toBe('first_friend_added');
      expect(firstFriend?.repeatable).toBe(false);
    });

    it('should include social_butterfly milestone', () => {
      const socialButterfly = MILESTONE_DEFINITIONS.find((m) => m.id === 'social_butterfly');

      expect(socialButterfly).toBeDefined();
      expect(socialButterfly?.category).toBe('social');
      expect(socialButterfly?.evaluator.type).toBe('threshold');
      if (socialButterfly?.evaluator.type === 'threshold') {
        expect(socialButterfly.evaluator.threshold).toBe(3);
      }
    });

    it('should include first_group milestone', () => {
      const firstGroup = MILESTONE_DEFINITIONS.find((m) => m.id === 'first_group');

      expect(firstGroup).toBeDefined();
      expect(firstGroup?.category).toBe('social');
      expect(firstGroup?.event).toBe('first_group_joined');
    });
  });

  describe('streak milestones', () => {
    const streakMilestones = ['streak_3', 'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_90'];

    streakMilestones.forEach((streakId) => {
      it(`should include ${streakId} milestone`, () => {
        const milestone = MILESTONE_DEFINITIONS.find((m) => m.id === streakId);

        expect(milestone).toBeDefined();
        expect(milestone?.category).toBe('streak');
        expect(milestone?.evaluator.type).toBe('threshold');
        expect(milestone?.event).toBe('streak_milestone');
        expect(milestone?.repeatable).toBe(false);
      });
    });

    it('should have incrementing thresholds for streak milestones', () => {
      const streakThresholds = MILESTONE_DEFINITIONS
        .filter((m) => m.category === 'streak')
        .map((m) => {
          if (m.evaluator.type === 'threshold') {
            return m.evaluator.threshold;
          }
          return 0;
        })
        .sort((a, b) => a - b);

      expect(streakThresholds).toEqual([3, 7, 14, 30, 60, 90]);
    });

    it('should include streak_days in event properties', () => {
      const streak7 = MILESTONE_DEFINITIONS.find((m) => m.id === 'streak_7');

      expect(streak7?.eventProperties).toBeDefined();
      expect(streak7?.eventProperties?.streak_days).toBe(7);
      expect(streak7?.eventProperties?.milestone).toBe(7);
    });
  });

  describe('getMilestoneById', () => {
    it('should return milestone by ID', () => {
      const milestone = getMilestoneById('first_friend');

      expect(milestone).toBeDefined();
      expect(milestone?.id).toBe('first_friend');
    });

    it('should return undefined for non-existent ID', () => {
      const milestone = getMilestoneById('nonexistent_milestone');

      expect(milestone).toBeUndefined();
    });
  });

  describe('getAllMilestoneIds', () => {
    it('should return all milestone IDs', () => {
      const ids = getAllMilestoneIds();

      expect(ids.length).toBe(MILESTONE_DEFINITIONS.length);
      expect(ids).toContain('first_friend');
      expect(ids).toContain('streak_7');
    });

    it('should return array of strings', () => {
      const ids = getAllMilestoneIds();

      ids.forEach((id) => {
        expect(typeof id).toBe('string');
      });
    });
  });

  describe('getMilestoneCountByCategory', () => {
    it('should return count of milestones per category', () => {
      const counts = getMilestoneCountByCategory();

      expect(counts).toBeDefined();
      expect(typeof counts).toBe('object');
    });

    it('should have social milestones', () => {
      const counts = getMilestoneCountByCategory();

      expect(counts.social).toBeGreaterThan(0);
    });

    it('should have streak milestones', () => {
      const counts = getMilestoneCountByCategory();

      expect(counts.streak).toBe(6); // 3, 7, 14, 30, 60, 90
    });

    it('should match total count', () => {
      const counts = getMilestoneCountByCategory();
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

      expect(total).toBe(MILESTONE_DEFINITIONS.length);
    });
  });

  describe('milestone ID naming conventions', () => {
    it('should use snake_case for all IDs', () => {
      MILESTONE_DEFINITIONS.forEach((milestone) => {
        expect(milestone.id).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });

    it('should not have IDs with leading/trailing underscores', () => {
      MILESTONE_DEFINITIONS.forEach((milestone) => {
        expect(milestone.id).not.toMatch(/^_/);
        expect(milestone.id).not.toMatch(/_$/);
      });
    });
  });

  describe('eventProperties validation', () => {
    it('should have valid eventProperties when defined', () => {
      MILESTONE_DEFINITIONS.forEach((milestone) => {
        if (milestone.eventProperties) {
          expect(typeof milestone.eventProperties).toBe('object');
          expect(milestone.eventProperties).not.toBeNull();
        }
      });
    });

    it('streak milestones should include matching milestone number in properties', () => {
      const streakMilestones = MILESTONE_DEFINITIONS.filter((m) => m.category === 'streak');

      streakMilestones.forEach((milestone) => {
        if (milestone.evaluator.type === 'threshold') {
          const threshold = milestone.evaluator.threshold;
          expect(milestone.eventProperties?.milestone).toBe(threshold);
          expect(milestone.eventProperties?.streak_days).toBe(threshold);
        }
      });
    });
  });

  describe('metrics consistency', () => {
    it('should use consistent metric names across milestones', () => {
      const metrics = new Set<string>();

      MILESTONE_DEFINITIONS.forEach((milestone) => {
        if (milestone.evaluator.type !== 'custom') {
          const evaluator = milestone.evaluator as { metric: string };
          metrics.add(evaluator.metric);
        }
      });

      // Verify expected metrics are used
      expect(metrics.has('friend_count')).toBe(true);
      expect(metrics.has('group_count')).toBe(true);
      expect(metrics.has('current_streak')).toBe(true);
    });
  });
});

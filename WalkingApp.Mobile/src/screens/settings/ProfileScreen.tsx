import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  Appbar,
  Text,
  Avatar,
  Button,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { StatCard } from '@screens/profile/components/StatCard';
import { WeeklyActivityCard } from '@screens/profile/components/WeeklyActivityCard';
import { AchievementChip } from '@screens/profile/components/AchievementChip';
import { useUserStore, UserStats, WeeklyActivity, Achievement } from '@store/userStore';
import { getErrorMessage } from '@utils/errorUtils';
import { getInitials, formatJoinDate } from '@utils/stringUtils';
import type { SettingsStackParamList } from '@navigation/types';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'Profile'>;

/**
 * Own Profile screen displaying the current user's profile information,
 * stats, weekly activity, and achievements.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const { currentUser, isLoading: isLoadingUser, fetchCurrentUser } = useUserStore();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchCurrentUserStats, fetchCurrentUserWeeklyActivity, fetchCurrentUserAchievements } =
    useUserStore();

  // Load profile data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [statsData, activityData, achievementsData] = await Promise.all([
        fetchCurrentUserStats(),
        fetchCurrentUserWeeklyActivity(),
        fetchCurrentUserAchievements(),
      ]);
      setStats(statsData);
      setWeeklyActivity(activityData);
      setAchievements(achievementsData);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }, [fetchCurrentUserStats, fetchCurrentUserWeeklyActivity, fetchCurrentUserAchievements]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchCurrentUser(), loadData()]);
    setIsRefreshing(false);
  }, [fetchCurrentUser, loadData]);

  const handleEditPress = useCallback(() => {
    navigation.navigate('EditProfile');
  }, [navigation]);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleAchievementPress = useCallback((_achievement: Achievement) => {
    // Could show a modal with achievement details in the future
  }, []);

  // Loading state
  if (isLoadingUser && !currentUser && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.Content title="Profile" />
        </Appbar.Header>
        <LoadingSpinner />
      </View>
    );
  }

  // Error state
  if (error && !currentUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.Content title="Profile" />
        </Appbar.Header>
        <ErrorMessage message={error} onRetry={handleRefresh} />
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.Content title="Profile" />
        </Appbar.Header>
        <ErrorMessage message="Failed to load profile" onRetry={handleRefresh} />
      </View>
    );
  }

  const units = currentUser.preferences.units;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Profile" />
        <Appbar.Action
          icon="cog"
          onPress={handleSettingsPress}
          accessibilityLabel="Settings"
        />
        <Appbar.Action
          icon="pencil"
          onPress={handleEditPress}
          accessibilityLabel="Edit profile"
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          {currentUser.avatar_url ? (
            <Avatar.Image
              size={100}
              source={{ uri: currentUser.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={100}
              label={getInitials(currentUser.display_name)}
              style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}
              labelStyle={{ color: theme.colors.onPrimaryContainer }}
            />
          )}

          <Text
            variant="headlineSmall"
            style={[styles.displayName, { color: theme.colors.onSurface }]}
          >
            {currentUser.display_name}
          </Text>

          <Text
            variant="bodyLarge"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            @{currentUser.username || currentUser.display_name.toLowerCase().replace(/\s/g, '_')}
          </Text>

          {currentUser.bio && (
            <Text
              variant="bodyMedium"
              style={[styles.bio, { color: theme.colors.onSurface }]}
            >
              "{currentUser.bio}"
            </Text>
          )}

          <View style={styles.metaRow}>
            {currentUser.location && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {currentUser.location}
              </Text>
            )}
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Joined {formatJoinDate(currentUser.created_at)}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard
              value={stats.friends_count}
              label="Friends"
              testID="stat-friends"
            />
            <StatCard
              value={stats.groups_count}
              label="Groups"
              testID="stat-groups"
            />
            <StatCard
              value={stats.badges_count}
              label="Badges"
              testID="stat-badges"
            />
          </View>
        )}

        {/* Weekly Activity */}
        {weeklyActivity && (
          <WeeklyActivityCard
            activity={weeklyActivity}
            units={units}
            testID="weekly-activity"
          />
        )}

        {/* Achievements Section */}
        {achievements.length > 0 && (
          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Achievements
            </Text>
            <View style={styles.achievementsRow}>
              {achievements.slice(0, 4).map((achievement) => (
                <AchievementChip
                  key={achievement.id}
                  achievement={achievement}
                  onPress={handleAchievementPress}
                  testID={`achievement-${achievement.id}`}
                />
              ))}
            </View>
            {achievements.length > 4 && (
              <Button
                mode="text"
                onPress={() => {
                  // Badges screen coming soon
                }}
                disabled
                accessibilityLabel="View all badges - coming soon"
              >
                View All Badges ({achievements.length}) - Coming Soon
              </Button>
            )}
          </View>
        )}

        {/* Empty achievements state */}
        {achievements.length === 0 && (
          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Achievements
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
            >
              Keep walking to earn badges!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  avatar: {
    marginBottom: 16,
  },
  displayName: {
    fontWeight: '700',
    marginBottom: 4,
  },
  bio: {
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  divider: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  achievementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
  },
});

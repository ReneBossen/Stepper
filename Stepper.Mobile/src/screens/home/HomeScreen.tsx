import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Appbar, Badge, Text, useTheme, Divider, FAB } from 'react-native-paper';
import { ManualStepEntryModal } from '@components/steps';
import { useNavigation } from '@react-navigation/native';
import type { HomeStackScreenProps } from '@navigation/types';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { track } from '@services/analytics';
import {
  GreetingHeader,
  StepCounterCard,
  StatCard,
  ActivityFeedItem,
} from './components';
import { useHomeData } from './hooks/useHomeData';
import type { ActivityItem } from '@store/activityStore';

type NavigationProp = HomeStackScreenProps<'Home'>['navigation'];

/**
 * Home screen - the main dashboard of the Walking App.
 * Displays today's step count, progress, weekly stats, and activity feed.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [showManualEntry, setShowManualEntry] = useState(false);

  const {
    todaySteps,
    todayDistance,
    dailyGoal,
    streak,
    weeklyAverage,
    weeklyTotal,
    displayName,
    units,
    activityFeed,
    activityError,
    unreadCount,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useHomeData();

  const handleNotificationsPress = useCallback(() => {
    navigation.getParent()?.navigate('Notifications');
  }, [navigation]);

  const handleSettingsPress = useCallback(() => {
    navigation.getParent()?.getParent()?.navigate('Tabs', { screen: 'SettingsTab' });
  }, [navigation]);

  const handleStepCardPress = useCallback(() => {
    navigation.getParent()?.getParent()?.navigate('Tabs', { screen: 'StepsTab' });
  }, [navigation]);

  const handleActivityPress = useCallback((item: ActivityItem) => {
    // Track activity feed item clicked
    track('activity_feed_item_clicked', { item_type: item.type });

    if (item.type === 'friend_achievement' && item.userId) {
      // Navigate to friend's profile
      navigation.getParent()?.getParent()?.navigate('Tabs', {
        screen: 'FriendsTab',
        params: {
          screen: 'UserProfile',
          params: { userId: item.userId },
        },
      });
    } else if (item.type === 'group_join' && item.userId) {
      // Navigate to group detail (if we had groupId in the item)
      navigation.getParent()?.getParent()?.navigate('Tabs', { screen: 'GroupsTab' });
    }
    // For personal milestones, we could show a celebration animation
  }, [navigation]);

  const handleAddStepsPress = useCallback(() => {
    // Track manual entry modal opened
    track('manual_entry_modal_opened', {});
    setShowManualEntry(true);
  }, []);

  const handleManualEntryDismiss = useCallback(() => {
    setShowManualEntry(false);
  }, []);

  const handleManualEntrySuccess = useCallback(() => {
    // Refresh the home data after successful entry
    refresh();
  }, [refresh]);

  const handleRefresh = useCallback(() => {
    // Track pull to refresh event
    track('pull_to_refresh', { screen: 'home' });
    refresh();
  }, [refresh]);

  // Show loading spinner on initial load
  if (isLoading && !isRefreshing && todaySteps === 0) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error && !isRefreshing) {
    return <ErrorMessage message={error} onRetry={refresh} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Walking App" />
        <View>
          <Appbar.Action
            icon="bell-outline"
            onPress={handleNotificationsPress}
            accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          />
          {unreadCount > 0 && (
            <Badge
              style={styles.badge}
              size={18}
              accessibilityLabel={`${unreadCount} unread notifications`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </View>
        <Appbar.Action
          icon="cog-outline"
          onPress={handleSettingsPress}
          accessibilityLabel="Settings"
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
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
        <GreetingHeader displayName={displayName} />

        <StepCounterCard
          steps={todaySteps}
          goal={dailyGoal}
          distance={todayDistance}
          streak={streak}
          units={units}
          onPress={handleStepCardPress}
        />

        <View style={styles.statsContainer}>
          <StatCard
            title="Weekly Average"
            value={weeklyAverage}
            subtitle="steps"
            testID="weekly-average-card"
          />
          <StatCard
            title="This Week"
            value={weeklyTotal}
            subtitle="steps"
            testID="weekly-total-card"
          />
        </View>

        <View style={styles.activitySection}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Recent Activity
          </Text>
          <Divider style={styles.divider} />

          {activityError ? (
            <View style={styles.emptyState}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Unable to load activity feed
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                Pull to refresh and try again
              </Text>
            </View>
          ) : activityFeed.length === 0 ? (
            <View style={styles.emptyState}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                No recent activity to show.
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                Connect with friends to see their achievements!
              </Text>
            </View>
          ) : (
            activityFeed.map((item: ActivityItem) => (
              <ActivityFeedItem
                key={item.id}
                item={item}
                onPress={handleActivityPress}
              />
            ))
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={handleAddStepsPress}
        accessibilityLabel="Add steps manually"
        testID="add-steps-fab"
      />

      <ManualStepEntryModal
        visible={showManualEntry}
        onDismiss={handleManualEntryDismiss}
        onSuccess={handleManualEntrySuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 88, // Space for FAB
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  activitySection: {
    marginTop: 24,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  divider: {
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import {
  Appbar,
  Text,
  Avatar,
  Divider,
  Menu,
  useTheme,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { StatCard } from '@screens/profile/components/StatCard';
import { WeeklyActivityCard } from '@screens/profile/components/WeeklyActivityCard';
import { AchievementChip } from '@screens/profile/components/AchievementChip';
import { MutualGroupItem } from '@screens/profile/components/MutualGroupItem';
import { FriendActionButton, FriendStatus } from '@screens/profile/components/FriendActionButton';
import { PrivacyRestrictedView } from '@screens/profile/components/PrivacyRestrictedView';
import { useUserStore, Achievement, MutualGroup } from '@store/userStore';
import { useFriendsStore } from '@store/friendsStore';
import { friendsApi } from '@services/api/friendsApi';
import { getErrorMessage } from '@utils/errorUtils';
import { getInitials, formatJoinDate } from '@utils/stringUtils';
import type { FriendsStackScreenProps, FriendsStackParamList, GroupsStackParamList } from '@navigation/types';

type Props = FriendsStackScreenProps<'UserProfile'>;
type NavigationProp = NativeStackNavigationProp<FriendsStackParamList, 'UserProfile'>;

/**
 * Other User Profile screen displaying another user's profile information,
 * stats, weekly activity, and friend action buttons.
 */
export default function UserProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const {
    viewedUser,
    isLoadingViewedUser,
    error: userError,
    fetchUserProfile,
    clearViewedUser,
  } = useUserStore();

  const { sendRequest, acceptRequest, declineRequest, removeFriend } = useFriendsStore();

  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [friendsSince, setFriendsSince] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingFriendAction, setIsLoadingFriendAction] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Load friend status
  const loadFriendStatus = useCallback(async () => {
    try {
      const status = await friendsApi.checkFriendshipStatus(userId);
      // Map API status to component status
      const statusMap: Record<string, FriendStatus> = {
        none: 'none',
        pending_sent: 'pending_sent',
        pending_received: 'pending_received',
        accepted: 'accepted',
      };
      setFriendStatus(statusMap[status] || 'none');

      // If friends, get the friendship date
      if (status === 'accepted') {
        // For now, we don't have easy access to accepted_at
        // This would require an additional API call
        // TODO: Add accepted_at to friendship status response
      }
    } catch {
      // Friend status check failed - will show default 'none' status
    }
  }, [userId]);

  // Load profile data
  const loadData = useCallback(async () => {
    await Promise.all([
      fetchUserProfile(userId),
      loadFriendStatus(),
    ]);
  }, [fetchUserProfile, userId, loadFriendStatus]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear state when leaving screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearViewedUser();
      };
    }, [clearViewedUser])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // Friend actions
  const handleAddFriend = useCallback(async () => {
    setIsLoadingFriendAction(true);
    try {
      await sendRequest(userId);
      setFriendStatus('pending_sent');
    } catch (err: unknown) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsLoadingFriendAction(false);
    }
  }, [userId, sendRequest]);

  const handleAcceptRequest = useCallback(async () => {
    setIsLoadingFriendAction(true);
    try {
      await acceptRequest(userId);
      setFriendStatus('accepted');
      setFriendsSince(new Date().toISOString());
    } catch (err: unknown) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsLoadingFriendAction(false);
    }
  }, [userId, acceptRequest]);

  const handleDeclineRequest = useCallback(async () => {
    setIsLoadingFriendAction(true);
    try {
      await declineRequest(userId);
      setFriendStatus('none');
    } catch (err: unknown) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsLoadingFriendAction(false);
    }
  }, [userId, declineRequest]);

  const handleRemoveFriend = useCallback(async () => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsLoadingFriendAction(true);
            try {
              await removeFriend(userId);
              setFriendStatus('none');
              setFriendsSince(undefined);
            } catch (err: unknown) {
              Alert.alert('Error', getErrorMessage(err));
            } finally {
              setIsLoadingFriendAction(false);
            }
          },
        },
      ]
    );
  }, [userId, removeFriend]);

  // Menu actions
  const handleMenuOpen = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handleReportUser = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      'Report User',
      'Are you sure you want to report this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement report user API
            Alert.alert('Reported', 'Thank you for your report. We will review it shortly.');
          },
        },
      ]
    );
  }, []);

  const handleBlockUser = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will not be able to see your profile or send you friend requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement block user API
            Alert.alert('Blocked', 'User has been blocked.');
            navigation.goBack();
          },
        },
      ]
    );
  }, [navigation]);

  const handleAchievementPress = useCallback((_achievement: Achievement) => {
    // Could show a modal with achievement details in the future
  }, []);

  const handleMutualGroupPress = useCallback((_group: MutualGroup) => {
    // Navigate to group detail in the future
    // Note: This requires navigating to a different stack
  }, []);

  // Loading state
  if (isLoadingViewedUser && !viewedUser && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Profile" />
        </Appbar.Header>
        <LoadingSpinner />
      </View>
    );
  }

  // Error state
  if (userError && !viewedUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Profile" />
        </Appbar.Header>
        <ErrorMessage message={userError} onRetry={handleRefresh} />
      </View>
    );
  }

  if (!viewedUser?.profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Profile" />
        </Appbar.Header>
        <ErrorMessage message="User not found" />
      </View>
    );
  }

  const { profile, stats, weeklyActivity, achievements, mutualGroups } = viewedUser;
  const isFriend = friendStatus === 'accepted';
  const isPrivate = profile.is_private && !isFriend;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={profile.display_name} />
        <Menu
          visible={menuVisible}
          onDismiss={handleMenuClose}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              onPress={handleMenuOpen}
              accessibilityLabel="More options"
            />
          }
        >
          <Menu.Item
            onPress={handleReportUser}
            title="Report User"
            leadingIcon="flag"
          />
          <Divider />
          <Menu.Item
            onPress={handleBlockUser}
            title="Block User"
            leadingIcon="block-helper"
          />
        </Menu>
      </Appbar.Header>

      {isPrivate ? (
        <PrivacyRestrictedView
          onAddFriend={friendStatus === 'none' ? handleAddFriend : undefined}
          isLoading={isLoadingFriendAction}
          testID="privacy-restricted"
        />
      ) : (
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
            {profile.avatar_url ? (
              <Avatar.Image
                size={100}
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Text
                size={100}
                label={getInitials(profile.display_name)}
                style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}
                labelStyle={{ color: theme.colors.onPrimaryContainer }}
              />
            )}

            <Text
              variant="headlineSmall"
              style={[styles.displayName, { color: theme.colors.onSurface }]}
            >
              {profile.display_name}
            </Text>

            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              @{profile.username}
            </Text>

            {isFriend && friendsSince && (
              <Text
                variant="bodySmall"
                style={[styles.friendsSince, { color: theme.colors.primary }]}
              >
                Friends since {formatJoinDate(friendsSince)}
              </Text>
            )}

            {profile.bio && (
              <Text
                variant="bodyMedium"
                style={[styles.bio, { color: theme.colors.onSurface }]}
              >
                "{profile.bio}"
              </Text>
            )}

            <View style={styles.metaRow}>
              {profile.location && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {profile.location}
                </Text>
              )}
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Joined {formatJoinDate(profile.created_at)}
              </Text>
            </View>
          </View>

          {/* Friend Action Button */}
          <View style={styles.actionSection}>
            <FriendActionButton
              status={friendStatus}
              friendsSince={friendsSince}
              isLoading={isLoadingFriendAction}
              onAddFriend={handleAddFriend}
              onAcceptRequest={handleAcceptRequest}
              onDeclineRequest={handleDeclineRequest}
              onRemoveFriend={handleRemoveFriend}
              testID="friend-action"
            />
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

          {/* Weekly Activity (only visible to friends or if activity is public) */}
          {weeklyActivity && (
            <View style={styles.section}>
              <WeeklyActivityCard
                activity={weeklyActivity}
                testID="weekly-activity"
              />
            </View>
          )}

          {/* Mutual Groups (only visible if friends) */}
          {isFriend && mutualGroups && mutualGroups.length > 0 && (
            <View style={styles.section}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Mutual Groups ({mutualGroups.length})
              </Text>
              {mutualGroups.map((group) => (
                <MutualGroupItem
                  key={group.id}
                  group={group}
                  onPress={handleMutualGroupPress}
                  testID={`mutual-group-${group.id}`}
                />
              ))}
            </View>
          )}

          {/* Achievements Section */}
          {achievements && achievements.length > 0 && (
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
            </View>
          )}
        </ScrollView>
      )}
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
    paddingBottom: 8,
  },
  avatar: {
    marginBottom: 16,
  },
  displayName: {
    fontWeight: '700',
    marginBottom: 4,
  },
  friendsSince: {
    marginTop: 4,
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
  actionSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  divider: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  achievementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

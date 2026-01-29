import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Appbar,
  Text,
  Switch,
  Divider,
  useTheme,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '@store/userStore';
import { getErrorMessage } from '@utils/errorUtils';
import type { UserPreferencesUpdate } from '@services/api/userPreferencesApi';

/**
 * Keys for notification preference fields in the user preferences.
 */
type NotificationPreferenceKey =
  | 'notify_friend_requests'
  | 'notify_friend_accepted'
  | 'notify_friend_milestones'
  | 'notify_group_invites'
  | 'notify_leaderboard_updates'
  | 'notify_competition_reminders'
  | 'notify_goal_achieved'
  | 'notify_streak_reminders'
  | 'notify_weekly_summary';

/**
 * Screen for configuring detailed notification preferences by category.
 */
export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser, updatePreferences, isLoading } = useUserStore();

  const [savingKey, setSavingKey] = useState<NotificationPreferenceKey | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Check if master toggle is enabled
  const masterEnabled = currentUser?.preferences.notifications_enabled ?? true;

  // Get notification settings from preferences with defaults
  const preferences = currentUser?.preferences;
  const notificationSettings = {
    notify_friend_requests: preferences?.notify_friend_requests ?? true,
    notify_friend_accepted: preferences?.notify_friend_accepted ?? true,
    notify_friend_milestones: preferences?.notify_friend_milestones ?? true,
    notify_group_invites: preferences?.notify_group_invites ?? true,
    notify_leaderboard_updates: preferences?.notify_leaderboard_updates ?? false,
    notify_competition_reminders: preferences?.notify_competition_reminders ?? true,
    notify_goal_achieved: preferences?.notify_goal_achieved ?? true,
    notify_streak_reminders: preferences?.notify_streak_reminders ?? true,
    notify_weekly_summary: preferences?.notify_weekly_summary ?? true,
  };

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  const handleToggle = useCallback(
    async (key: NotificationPreferenceKey) => {
      if (!masterEnabled) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable push notifications in the main Settings to configure notification preferences.',
          [{ text: 'OK' }]
        );
        return;
      }

      const newValue = !notificationSettings[key];
      setSavingKey(key);

      try {
        const update: UserPreferencesUpdate = { [key]: newValue };
        await updatePreferences(update);
        showSnackbar('Preference updated');
      } catch (error) {
        Alert.alert('Error', getErrorMessage(error));
      } finally {
        setSavingKey(null);
      }
    },
    [masterEnabled, notificationSettings, updatePreferences, showSnackbar]
  );

  const handleDismissSnackbar = useCallback(() => {
    setSnackbarVisible(false);
  }, []);

  const renderToggle = (
    key: NotificationPreferenceKey,
    label: string,
    testId: string
  ) => {
    const value = notificationSettings[key];
    const isSavingThis = savingKey === key;

    return (
      <View style={styles.toggleRow}>
        <Text
          variant="bodyMedium"
          style={[
            styles.toggleLabel,
            { color: masterEnabled ? theme.colors.onSurface : theme.colors.onSurfaceDisabled },
          ]}
        >
          {label}
        </Text>
        {isSavingThis ? (
          <ActivityIndicator size="small" testID={`${testId}-loading`} />
        ) : (
          <Switch
            value={value}
            onValueChange={() => handleToggle(key)}
            disabled={!masterEnabled || savingKey !== null}
            testID={testId}
            accessibilityLabel={`${label} toggle, currently ${value ? 'enabled' : 'disabled'}`}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
        <Appbar.Content title="Notification Settings" />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning if master toggle is disabled */}
        {!masterEnabled && (
          <View style={[styles.warningBanner, { backgroundColor: theme.colors.errorContainer }]}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onErrorContainer }}
            >
              Push notifications are disabled. Enable them in Settings to configure these preferences.
            </Text>
          </View>
        )}

        {/* Friend Activity Section */}
        <View style={styles.section}>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Friend Activity
          </Text>
          {renderToggle('notify_friend_requests', 'Friend Requests', 'notif-friend-requests')}
          {renderToggle('notify_friend_accepted', 'Friend Accepted', 'notif-friend-accepted')}
          {renderToggle('notify_friend_milestones', 'Friend Milestones', 'notif-friend-milestones')}
        </View>

        <Divider style={styles.divider} />

        {/* Groups Section */}
        <View style={styles.section}>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Groups
          </Text>
          {renderToggle('notify_group_invites', 'Group Invites', 'notif-group-invites')}
          {renderToggle('notify_leaderboard_updates', 'Leaderboard Updates', 'notif-leaderboard-updates')}
          {renderToggle('notify_competition_reminders', 'Competition Reminders', 'notif-competition-reminders')}
        </View>

        <Divider style={styles.divider} />

        {/* Personal Section */}
        <View style={styles.section}>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Personal
          </Text>
          {renderToggle('notify_goal_achieved', 'Daily Goal Achieved', 'notif-goal-achieved')}
          {renderToggle('notify_streak_reminders', 'Streak Reminders', 'notif-streak-reminders')}
          {renderToggle('notify_weekly_summary', 'Weekly Summary', 'notif-weekly-summary')}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}
          >
            Note: These preferences control which notifications you receive when push notifications are enabled.
          </Text>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={handleDismissSnackbar}
        duration={2000}
      >
        {snackbarMessage}
      </Snackbar>
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
    paddingBottom: 32,
  },
  warningBanner: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleLabel: {
    flex: 1,
    marginRight: 16,
  },
  divider: {
    marginHorizontal: 16,
  },
  infoNote: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});

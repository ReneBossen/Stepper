import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import {
  Text,
  List,
  Divider,
  Switch,
  useTheme,
  Snackbar,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@store/authStore';
import { useUserStore, ThemePreference } from '@store/userStore';
import { getErrorMessage } from '@utils/errorUtils';
import type { SettingsStackParamList } from '@navigation/types';
import {
  UnitsModal,
  DailyGoalModal,
  ThemeModal,
  PrivacyModal,
  SignOutDialog,
  ChangePasswordModal,
} from './components';
import type { PrivacySettingType } from './components';
import type { PrivacyLevel } from '@services/api/userPreferencesApi';
import { supabase } from '@services/supabase';

// App version from app.json (would use expo-application in production)
const APP_VERSION = '1.0.0';

// External URLs
const TERMS_URL = 'https://walkingapp.com/terms';
const PRIVACY_URL = 'https://walkingapp.com/privacy';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const signOut = useAuthStore((state) => state.signOut);
  const {
    currentUser,
    themePreference,
    updatePreferences,
    setThemePreference,
    clearUser,
  } = useUserStore();

  // Modal visibility states
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Privacy modal state
  const [activePrivacySetting, setActivePrivacySetting] = useState<PrivacySettingType>('profile_visibility');

  // Loading states
  const [isSavingUnits, setIsSavingUnits] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // User email state
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch user email on mount
  useEffect(() => {
    const fetchEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchEmail();
  }, []);

  // Get user preferences with defaults
  const preferences = currentUser?.preferences;
  const units = preferences?.units ?? 'metric';
  const dailyStepGoal = preferences?.daily_step_goal ?? 10000;
  const notificationsEnabled = preferences?.notifications_enabled ?? true;
  const privacyProfileVisibility = preferences?.privacy_profile_visibility ?? 'public';
  const privacyFindMe = preferences?.privacy_find_me ?? 'public';
  const privacyShowSteps = preferences?.privacy_show_steps ?? 'partial';

  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  const handleDismissSnackbar = useCallback(() => {
    setSnackbarVisible(false);
  }, []);

  // Navigation handlers
  const handleProfilePress = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  const handleNotificationSettingsPress = useCallback(() => {
    navigation.navigate('NotificationSettings');
  }, [navigation]);

  // Units modal handlers
  const handleUnitsPress = useCallback(() => {
    setShowUnitsModal(true);
  }, []);

  const handleUnitsSave = useCallback(async (newUnits: 'metric' | 'imperial') => {
    setIsSavingUnits(true);
    try {
      await updatePreferences({ units: newUnits });
      setShowUnitsModal(false);
      showSnackbar('Units preference saved');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsSavingUnits(false);
    }
  }, [updatePreferences, showSnackbar]);

  // Daily goal modal handlers
  const handleGoalPress = useCallback(() => {
    setShowGoalModal(true);
  }, []);

  const handleGoalSave = useCallback(async (newGoal: number) => {
    setIsSavingGoal(true);
    try {
      await updatePreferences({ daily_step_goal: newGoal });
      setShowGoalModal(false);
      showSnackbar('Daily step goal saved');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsSavingGoal(false);
    }
  }, [updatePreferences, showSnackbar]);

  // Theme modal handlers
  const handleThemePress = useCallback(() => {
    setShowThemeModal(true);
  }, []);

  const handleThemeSave = useCallback((newTheme: ThemePreference) => {
    setThemePreference(newTheme);
    showSnackbar('Theme preference saved');
  }, [setThemePreference, showSnackbar]);

  // Notification toggle handler
  const handleNotificationToggle = useCallback(async () => {
    setIsTogglingNotifications(true);
    try {
      if (!notificationsEnabled) {
        // Request permission if enabling
        const { status: existingStatus } = await Notifications.getPermissionsAsync();

        if (existingStatus === 'granted') {
          await updatePreferences({ notifications_enabled: true });
          showSnackbar('Push notifications enabled');
        } else {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            await updatePreferences({ notifications_enabled: true });
            showSnackbar('Push notifications enabled');
          } else {
            // Permission denied
            Alert.alert(
              'Permission Required',
              'Push notifications are disabled in your device settings. Would you like to open Settings to enable them?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => {
                    if (Platform.OS === 'ios') {
                      Linking.openURL('app-settings:');
                    } else {
                      Linking.openSettings();
                    }
                  },
                },
              ]
            );
          }
        }
      } else {
        // Disabling notifications
        await updatePreferences({ notifications_enabled: false });
        showSnackbar('Push notifications disabled');
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsTogglingNotifications(false);
    }
  }, [notificationsEnabled, updatePreferences, showSnackbar]);

  // Change password modal handlers
  const handleChangePasswordPress = useCallback(() => {
    setShowChangePasswordModal(true);
  }, []);

  const handleChangePasswordSave = useCallback(async (newPassword: string) => {
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setShowChangePasswordModal(false);
      showSnackbar('Password changed successfully');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  }, [showSnackbar]);

  // Privacy modal handlers
  const handlePrivacyPress = useCallback((settingType: PrivacySettingType) => {
    setActivePrivacySetting(settingType);
    setShowPrivacyModal(true);
  }, []);

  const handlePrivacySave = useCallback(async (value: PrivacyLevel) => {
    setIsSavingPrivacy(true);
    try {
      if (activePrivacySetting === 'profile_visibility') {
        await updatePreferences({ privacy_profile_visibility: value });
      } else if (activePrivacySetting === 'find_me') {
        await updatePreferences({ privacy_find_me: value });
      } else if (activePrivacySetting === 'activity_visibility') {
        await updatePreferences({ privacy_show_steps: value });
      }
      setShowPrivacyModal(false);
      showSnackbar('Privacy setting saved');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsSavingPrivacy(false);
    }
  }, [activePrivacySetting, updatePreferences, showSnackbar]);

  // External links handlers
  const handleTermsPress = useCallback(() => {
    Linking.openURL(TERMS_URL).catch(() => {
      Alert.alert('Error', 'Unable to open Terms of Service');
    });
  }, []);

  const handlePrivacyPolicyPress = useCallback(() => {
    Linking.openURL(PRIVACY_URL).catch(() => {
      Alert.alert('Error', 'Unable to open Privacy Policy');
    });
  }, []);

  // Sign out handlers
  const handleSignOutPress = useCallback(() => {
    setShowSignOutDialog(true);
  }, []);

  const handleSignOutConfirm = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      clearUser();
      setShowSignOutDialog(false);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, clearUser]);

  // Helper functions for display values
  const getUnitsLabel = () => {
    return units === 'metric' ? 'Metric (km)' : 'Imperial (miles)';
  };

  const getGoalLabel = () => {
    return `${dailyStepGoal.toLocaleString()} steps`;
  };

  const getThemeLabel = () => {
    switch (themePreference) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      default:
        return 'System Default';
    }
  };

  const getPrivacyLabel = (value: PrivacyLevel) => {
    switch (value) {
      case 'public':
        return 'Everyone';
      case 'partial':
        return 'Friends Only';
      case 'private':
        return 'Nobody';
      default:
        return 'Unknown';
    }
  };

  const getCurrentPrivacyValue = (): PrivacyLevel => {
    if (activePrivacySetting === 'profile_visibility') {
      return privacyProfileVisibility;
    } else if (activePrivacySetting === 'find_me') {
      return privacyFindMe;
    } else if (activePrivacySetting === 'activity_visibility') {
      return privacyShowSteps;
    }
    return 'public';
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Account Section */}
      <View style={styles.section}>
        <Text
          variant="titleSmall"
          style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Account
        </Text>
        <List.Item
          title="Profile"
          description={currentUser?.display_name || 'Edit your profile'}
          left={(props) => <List.Icon {...props} icon="account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleProfilePress}
          style={styles.listItem}
          accessibilityLabel="Go to profile"
          testID="settings-profile"
        />
        <List.Item
          title="Email"
          description={userEmail || 'Loading...'}
          left={(props) => <List.Icon {...props} icon="email" />}
          style={styles.listItem}
          accessibilityLabel={`Email: ${userEmail || 'Loading'}`}
          testID="settings-email"
        />
        <List.Item
          title="Change Password"
          left={(props) => <List.Icon {...props} icon="lock" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleChangePasswordPress}
          style={styles.listItem}
          accessibilityLabel="Change password"
          testID="settings-change-password"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text
          variant="titleSmall"
          style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Preferences
        </Text>
        <List.Item
          title="Units"
          description={getUnitsLabel()}
          left={(props) => <List.Icon {...props} icon="ruler" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleUnitsPress}
          style={styles.listItem}
          accessibilityLabel={`Units: ${getUnitsLabel()}`}
          testID="settings-units"
        />
        <List.Item
          title="Daily Step Goal"
          description={getGoalLabel()}
          left={(props) => <List.Icon {...props} icon="target" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleGoalPress}
          style={styles.listItem}
          accessibilityLabel={`Daily step goal: ${getGoalLabel()}`}
          testID="settings-daily-goal"
        />
        <List.Item
          title="Theme"
          description={getThemeLabel()}
          left={(props) => <List.Icon {...props} icon="palette" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleThemePress}
          style={styles.listItem}
          accessibilityLabel={`Theme: ${getThemeLabel()}`}
          testID="settings-theme"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text
          variant="titleSmall"
          style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Notifications
        </Text>
        <View style={styles.switchRow}>
          <View style={styles.switchContent}>
            <List.Icon icon="bell" />
            <View style={styles.switchText}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                Push Notifications
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            disabled={isTogglingNotifications}
            testID="settings-notifications-switch"
            accessibilityLabel={`Push notifications toggle, currently ${notificationsEnabled ? 'enabled' : 'disabled'}`}
          />
        </View>
        <List.Item
          title="Notification Settings"
          description="Configure notification types"
          left={(props) => <List.Icon {...props} icon="bell-cog" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleNotificationSettingsPress}
          style={styles.listItem}
          accessibilityLabel="Configure notification settings"
          testID="settings-notification-settings"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Privacy Section */}
      <View style={styles.section}>
        <Text
          variant="titleSmall"
          style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Privacy
        </Text>
        <List.Item
          title="Profile Visibility"
          description={getPrivacyLabel(privacyProfileVisibility)}
          left={(props) => <List.Icon {...props} icon="account-eye" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => handlePrivacyPress('profile_visibility')}
          style={styles.listItem}
          accessibilityLabel={`Profile visibility: ${getPrivacyLabel(privacyProfileVisibility)}`}
          testID="settings-profile-visibility"
        />
        <List.Item
          title="Activity Visibility"
          description={getPrivacyLabel(privacyShowSteps)}
          left={(props) => <List.Icon {...props} icon="chart-line" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => handlePrivacyPress('activity_visibility')}
          style={styles.listItem}
          accessibilityLabel={`Activity visibility: ${getPrivacyLabel(privacyShowSteps)}`}
          testID="settings-activity-visibility"
        />
        <List.Item
          title="Who Can Find Me"
          description={getPrivacyLabel(privacyFindMe)}
          left={(props) => <List.Icon {...props} icon="magnify" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => handlePrivacyPress('find_me')}
          style={styles.listItem}
          accessibilityLabel={`Who can find me: ${getPrivacyLabel(privacyFindMe)}`}
          testID="settings-find-me"
        />
      </View>

      <Divider style={styles.divider} />

      {/* About Section */}
      <View style={styles.section}>
        <Text
          variant="titleSmall"
          style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
        >
          About
        </Text>
        <List.Item
          title="App Version"
          description={APP_VERSION}
          left={(props) => <List.Icon {...props} icon="information" />}
          style={styles.listItem}
          accessibilityLabel={`App version ${APP_VERSION}`}
          testID="settings-app-version"
        />
        <List.Item
          title="Terms of Service"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={handleTermsPress}
          style={styles.listItem}
          accessibilityLabel="Open Terms of Service"
          testID="settings-terms"
        />
        <List.Item
          title="Privacy Policy"
          left={(props) => <List.Icon {...props} icon="shield-lock" />}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={handlePrivacyPolicyPress}
          style={styles.listItem}
          accessibilityLabel="Open Privacy Policy"
          testID="settings-privacy-policy"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Sign Out Section */}
      <View style={styles.section}>
        <List.Item
          title="Sign Out"
          titleStyle={{ color: theme.colors.error }}
          left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
          onPress={handleSignOutPress}
          style={styles.listItem}
          accessibilityLabel="Sign out"
          testID="settings-sign-out"
        />
      </View>

      {/* Modals */}
      <UnitsModal
        visible={showUnitsModal}
        currentUnits={units}
        onDismiss={() => setShowUnitsModal(false)}
        onSave={handleUnitsSave}
        isSaving={isSavingUnits}
      />

      <DailyGoalModal
        visible={showGoalModal}
        currentGoal={dailyStepGoal}
        onDismiss={() => setShowGoalModal(false)}
        onSave={handleGoalSave}
        isSaving={isSavingGoal}
      />

      <ThemeModal
        visible={showThemeModal}
        currentTheme={themePreference}
        onDismiss={() => setShowThemeModal(false)}
        onSave={handleThemeSave}
      />

      <PrivacyModal
        visible={showPrivacyModal}
        settingType={activePrivacySetting}
        currentValue={getCurrentPrivacyValue()}
        onDismiss={() => setShowPrivacyModal(false)}
        onSave={handlePrivacySave}
        isSaving={isSavingPrivacy}
      />

      <SignOutDialog
        visible={showSignOutDialog}
        onDismiss={() => setShowSignOutDialog(false)}
        onConfirm={handleSignOutConfirm}
        isLoading={isSigningOut}
      />

      <ChangePasswordModal
        visible={showChangePasswordModal}
        onDismiss={() => setShowChangePasswordModal(false)}
        onSave={handleChangePasswordSave}
        isSaving={isChangingPassword}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={handleDismissSnackbar}
        duration={2000}
        testID="settings-snackbar"
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  listItem: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  divider: {
    marginHorizontal: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchText: {
    flex: 1,
    marginLeft: 8,
  },
});

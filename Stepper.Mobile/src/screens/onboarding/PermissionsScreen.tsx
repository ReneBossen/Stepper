import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Card, IconButton } from 'react-native-paper';
import { OnboardingStackScreenProps } from '@navigation/types';
import { useAppTheme } from '@hooks/useAppTheme';
import { track } from '@services/analytics';
import OnboardingLayout from './components/OnboardingLayout';
import * as Notifications from 'expo-notifications';

type Props = OnboardingStackScreenProps<'Permissions'>;

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export default function PermissionsScreen({ navigation }: Props) {
  const { paperTheme } = useAppTheme();
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(false);
  const hasTrackedStep = useRef(false);

  // Track permissions step on mount (step 3 in onboarding flow)
  useEffect(() => {
    if (!hasTrackedStep.current) {
      track('onboarding_step_completed', { step_number: 3, step_name: 'permissions' });
      hasTrackedStep.current = true;
    }
  }, []);

  const handleRequestNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus === 'granted') {
        setNotificationStatus('granted');
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        setNotificationStatus('granted');
        // Register for push notifications if granted
        await registerForPushNotifications();
      } else {
        setNotificationStatus('denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setNotificationStatus('denied');
    }
  };

  const registerForPushNotifications = async () => {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('Push token:', token.data);
      // TODO: Send token to backend when endpoint is ready
      // await notificationsApi.registerPushToken(token.data);
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const handleContinue = () => {
    // Navigate to profile setup
    navigation.navigate('ProfileSetup');
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Permissions',
      'Some features may not work properly without permissions. You can enable them later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip Anyway',
          onPress: () => {
            // Track onboarding skipped event when user skips permissions
            track('onboarding_skipped', {});
            handleContinue();
          },
        },
      ]
    );
  };

  const getPermissionIcon = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return 'check-circle';
      case 'denied':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getPermissionColor = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return paperTheme.colors.primary;
      case 'denied':
        return paperTheme.colors.error;
      default:
        return paperTheme.colors.outline;
    }
  };

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text variant="labelLarge" style={{ color: paperTheme.colors.primary }}>
            ← Back
          </Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text variant="headlineMedium" style={[styles.title, { color: paperTheme.colors.onBackground }]}>
            We Need Permissions
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            To provide the best experience
          </Text>

          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="displaySmall" style={styles.cardIcon}>
                  🔔
                </Text>
                <IconButton
                  icon={getPermissionIcon(notificationStatus)}
                  iconColor={getPermissionColor(notificationStatus)}
                  size={24}
                />
              </View>
              <Text variant="titleMedium" style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                Notifications
              </Text>
              <Text variant="bodyMedium" style={[styles.cardDescription, { color: paperTheme.colors.onSurfaceVariant }]}>
                Get updates on friend requests and achievements
              </Text>
              {notificationStatus !== 'granted' && (
                <Button
                  mode="contained-tonal"
                  onPress={handleRequestNotifications}
                  style={styles.permissionButton}
                  disabled={isLoading}
                >
                  Allow
                </Button>
              )}
              {notificationStatus === 'granted' && (
                <Text variant="bodySmall" style={[styles.statusText, { color: paperTheme.colors.primary }]}>
                  ✓ Permission granted
                </Text>
              )}
              {notificationStatus === 'denied' && (
                <Text variant="bodySmall" style={[styles.statusText, { color: paperTheme.colors.error }]}>
                  Permission denied. You can enable it later in Settings.
                </Text>
              )}
            </Card.Content>
          </Card>

          <Text variant="bodySmall" style={[styles.note, { color: paperTheme.colors.onSurfaceVariant }]}>
            Note: Step tracking will be enabled once you start using the app. No additional permissions needed.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleContinue}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Continue
          </Button>
          <TouchableOpacity onPress={handleSkip} style={styles.skipTextButton}>
            <Text variant="labelLarge" style={{ color: paperTheme.colors.primary }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
  },
  card: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 48,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 8,
  },
  statusText: {
    marginTop: 8,
  },
  note: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footer: {
    paddingTop: 16,
  },
  button: {
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  skipTextButton: {
    padding: 12,
    alignSelf: 'center',
  },
});

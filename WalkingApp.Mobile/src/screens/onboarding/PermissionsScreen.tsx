import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { OnboardingStackScreenProps } from '@navigation/types';
import OnboardingLayout from './components/OnboardingLayout';
import PermissionCard from './components/PermissionCard';
import { usePermissions } from './hooks/usePermissions';

type PermissionsScreenProps = OnboardingStackScreenProps<'Permissions'>;

export default function PermissionsScreen({ navigation }: PermissionsScreenProps) {
  const theme = useTheme();
  const {
    notificationPermissionStatus,
    activityPermissionStatus,
    requestNotificationPermission,
    requestActivityPermission
  } = usePermissions();

  const handleContinue = () => {
    navigation.navigate('ProfileSetup');
  };

  const handleSkip = () => {
    navigation.navigate('ProfileSetup');
  };

  return (
    <OnboardingLayout>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            We Need Permissions
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            To provide the best experience
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <PermissionCard
            emoji="🏃"
            title="Activity & Motion"
            description="Track your daily steps and distance"
            status={activityPermissionStatus}
            onRequestPermission={requestActivityPermission}
            testID="activity-permission-card"
          />
          <PermissionCard
            emoji="🔔"
            title="Notifications"
            description="Get updates on friend requests and achievements"
            status={notificationPermissionStatus}
            onRequestPermission={requestNotificationPermission}
            testID="notification-permission-card"
          />
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleContinue}
            style={styles.continueButton}
            testID="continue-button"
          >
            Continue
          </Button>
          <Button
            mode="text"
            onPress={handleSkip}
            style={styles.skipButton}
            testID="skip-button"
          >
            Skip for now
          </Button>
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 20,
  },
  cardsContainer: {
    flex: 1,
  },
  footer: {
    marginTop: 32,
  },
  continueButton: {
    marginBottom: 12,
  },
  skipButton: {
    alignSelf: 'center',
  },
});

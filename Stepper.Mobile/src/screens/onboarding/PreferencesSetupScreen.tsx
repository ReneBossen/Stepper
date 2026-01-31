import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Button, SegmentedButtons, TextInput, Menu } from 'react-native-paper';
import { OnboardingStackScreenProps } from '@navigation/types';
import { useAppTheme } from '@hooks/useAppTheme';
import { useUserStore, UserPreferencesUpdate, PrivacyLevel } from '@store/userStore';
import { getErrorMessage } from '@utils/errorUtils';
import { track, setUserProperties } from '@services/analytics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

type Props = OnboardingStackScreenProps<'PreferencesSetup'>;

export default function PreferencesSetupScreen({ navigation }: Props) {
  const { paperTheme } = useAppTheme();
  const updateProfile = useUserStore((state) => state.updateProfile);
  const updatePreferences = useUserStore((state) => state.updatePreferences);
  const currentUser = useUserStore((state) => state.currentUser);
  const hasTrackedStep = useRef(false);

  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [dailyStepGoal, setDailyStepGoal] = useState(10000);
  const [findMeVisible, setFindMeVisible] = useState(false);
  const [showStepsVisible, setShowStepsVisible] = useState(false);
  const [findMe, setFindMe] = useState<PrivacyLevel>('public');
  const [showSteps, setShowSteps] = useState<PrivacyLevel>('partial');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track preferences step on mount (step 5 in onboarding flow)
  useEffect(() => {
    if (!hasTrackedStep.current) {
      track('onboarding_step_completed', { step_number: 5, step_name: 'preferences' });
      hasTrackedStep.current = true;
    }
  }, []);

  const privacyOptions: { value: PrivacyLevel; label: string }[] = [
    { value: 'public', label: 'Everyone' },
    { value: 'partial', label: 'Friends Only' },
    { value: 'private', label: 'Nobody' },
  ];

  const handleFinish = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Update preferences using the new flat structure
      const preferences: UserPreferencesUpdate = {
        units,
        daily_step_goal: dailyStepGoal,
        privacy_find_me: findMe,
        privacy_show_steps: showSteps,
      };

      await updatePreferences(preferences);

      // Mark onboarding as completed
      await updateProfile({
        onboarding_completed: true,
      });

      // Track onboarding completed event
      track('onboarding_completed', {});

      // Set user properties for preferences
      setUserProperties({
        daily_step_goal: dailyStepGoal,
        units,
        onboarding_completed: true,
      });

      // Navigation will automatically happen when onboarding_completed changes in RootNavigator
      // The RootNavigator is watching currentUser.onboarding_completed
    } catch (error: unknown) {
      console.error('Error completing onboarding:', error);
      setError(getErrorMessage(error, 'Failed to save preferences. Please try again.'));
      setIsLoading(false);
    }
  };

  const formatStepGoal = (value: number) => {
    return value.toLocaleString();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: paperTheme.colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text variant="labelLarge" style={{ color: paperTheme.colors.primary }}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text variant="headlineMedium" style={[styles.title, { color: paperTheme.colors.onBackground }]}>
          Set Your Preferences
        </Text>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: paperTheme.colors.onBackground }]}>
            Units
          </Text>
          <SegmentedButtons
            value={units}
            onValueChange={(value) => setUnits(value as 'metric' | 'imperial')}
            buttons={[
              { value: 'metric', label: 'Metric (km)' },
              { value: 'imperial', label: 'Imperial (mi)' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: paperTheme.colors.onBackground }]}>
            Daily Step Goal
          </Text>
          <View style={styles.goalContainer}>
            <Text variant="headlineSmall" style={[styles.goalValue, { color: paperTheme.colors.primary }]}>
              {formatStepGoal(dailyStepGoal)}
            </Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              steps per day
            </Text>
          </View>
          <View style={styles.sliderContainer}>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              1,000
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1000}
              maximumValue={50000}
              step={1000}
              value={dailyStepGoal}
              onValueChange={setDailyStepGoal}
              minimumTrackTintColor={paperTheme.colors.primary}
              maximumTrackTintColor={paperTheme.colors.surfaceVariant}
              thumbTintColor={paperTheme.colors.primary}
            />
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              50,000
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: paperTheme.colors.onBackground }]}>
            Privacy
          </Text>

          <Text variant="bodyMedium" style={[styles.privacyLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Who can find you?
          </Text>
          <Menu
            visible={findMeVisible}
            onDismiss={() => setFindMeVisible(false)}
            anchor={
              <TouchableOpacity
                onPress={() => setFindMeVisible(true)}
                style={[styles.menuButton, { borderColor: paperTheme.colors.outline }]}
              >
                <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurface }}>
                  {privacyOptions.find((opt) => opt.value === findMe)?.label}
                </Text>
                <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                  ▼
                </Text>
              </TouchableOpacity>
            }
          >
            {privacyOptions.map((option) => (
              <Menu.Item
                key={option.value}
                onPress={() => {
                  setFindMe(option.value);
                  setFindMeVisible(false);
                }}
                title={option.label}
              />
            ))}
          </Menu>

          <Text variant="bodyMedium" style={[styles.privacyLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Who can see your steps?
          </Text>
          <Menu
            visible={showStepsVisible}
            onDismiss={() => setShowStepsVisible(false)}
            anchor={
              <TouchableOpacity
                onPress={() => setShowStepsVisible(true)}
                style={[styles.menuButton, { borderColor: paperTheme.colors.outline }]}
              >
                <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurface }}>
                  {privacyOptions.find((opt) => opt.value === showSteps)?.label}
                </Text>
                <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                  ▼
                </Text>
              </TouchableOpacity>
            }
          >
            {privacyOptions.map((option) => (
              <Menu.Item
                key={option.value}
                onPress={() => {
                  setShowSteps(option.value);
                  setShowStepsVisible(false);
                }}
                title={option.label}
              />
            ))}
          </Menu>
        </View>

        {error && (
          <Text variant="bodySmall" style={[styles.error, { color: paperTheme.colors.error }]}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleFinish}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Finish Setup
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  backButton: {
    padding: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontWeight: '600',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  goalContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  goalValue: {
    fontWeight: '700',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  privacyLabel: {
    marginBottom: 8,
    marginTop: 8,
  },
  menuButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 16,
  },
  error: {
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    paddingTop: 8,
  },
  button: {
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

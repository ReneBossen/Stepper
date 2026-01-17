import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, SegmentedButtons, Button, useTheme, Menu, HelperText } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { CommonActions } from '@react-navigation/native';
import { OnboardingStackScreenProps } from '@navigation/types';
import OnboardingLayout from './components/OnboardingLayout';
import { useUserStore } from '@store/userStore';
import { useOnboarding } from './hooks/useOnboarding';

type PreferencesSetupScreenProps = OnboardingStackScreenProps<'PreferencesSetup'>;

/**
 * Privacy level for "Who can find you?" setting.
 * Maps to backend field: privacy.find_me
 * - 'everyone': Any user can discover your profile
 * - 'friends': Only confirmed friends can find you
 * - 'nobody': Profile is not discoverable in search
 */
type FindMePrivacy = 'everyone' | 'friends' | 'nobody';

/**
 * Privacy level for activity visibility (steps, distance, etc).
 * Maps to backend field: privacy.activity_visibility
 * - 'public': Activity visible to all users (equivalent to 'everyone')
 * - 'friends': Activity visible only to confirmed friends
 * - 'private': Activity not visible to anyone (equivalent to 'nobody')
 */
type ActivityPrivacy = 'public' | 'friends' | 'private';

export default function PreferencesSetupScreen({ navigation }: PreferencesSetupScreenProps) {
  const theme = useTheme();
  const { updatePreferences } = useUserStore();
  const { markOnboardingComplete } = useOnboarding();

  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [dailyStepGoal, setDailyStepGoal] = useState(10000);
  const [findMeVisible, setFindMeVisible] = useState(false);
  const [showStepsVisible, setShowStepsVisible] = useState(false);
  const [findMePrivacy, setFindMePrivacy] = useState<FindMePrivacy>('everyone');
  const [showStepsPrivacy, setShowStepsPrivacy] = useState<ActivityPrivacy>('public');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updatePreferences({
        units,
        daily_step_goal: dailyStepGoal,
        privacy: {
          find_me: findMePrivacy,
          activity_visibility: showStepsPrivacy,
          // Default to 'public' during onboarding. Users can change this later in settings.
          // This keeps the onboarding flow simple while ensuring profile is visible by default.
          profile_visibility: 'public',
        },
      });

      await markOnboardingComplete();

      // After marking complete, the app will automatically navigate to Main
      // through RootNavigator's effect. We need to trigger a re-render.
      // The simplest way is to navigate to the root and reset.
      navigation.getParent()?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
      setIsSaving(false);
    }
  };

  const getFindMeLabel = (level: FindMePrivacy): string => {
    switch (level) {
      case 'everyone':
        return 'Everyone';
      case 'friends':
        return 'Friends Only';
      case 'nobody':
        return 'Nobody';
    }
  };

  const getActivityLabel = (level: ActivityPrivacy): string => {
    switch (level) {
      case 'public':
        return 'Everyone';
      case 'friends':
        return 'Friends Only';
      case 'private':
        return 'Nobody';
    }
  };

  const formatStepGoal = (value: number): string => {
    return value.toLocaleString();
  };

  return (
    <OnboardingLayout>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            Set Your Preferences
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Units
          </Text>
          <SegmentedButtons
            value={units}
            onValueChange={(value) => setUnits(value as 'metric' | 'imperial')}
            buttons={[
              {
                value: 'metric',
                label: 'Metric',
                icon: units === 'metric' ? 'check' : undefined,
              },
              {
                value: 'imperial',
                label: 'Imperial',
                icon: units === 'imperial' ? 'check' : undefined,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Daily Step Goal
          </Text>
          <Text variant="headlineSmall" style={[styles.goalValue, { color: theme.colors.primary }]}>
            {formatStepGoal(dailyStepGoal)}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1000}
            maximumValue={50000}
            step={1000}
            value={dailyStepGoal}
            onValueChange={setDailyStepGoal}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surfaceVariant}
            thumbTintColor={theme.colors.primary}
          />
          <View style={styles.sliderLabels}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              1,000
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              50,000
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Privacy
          </Text>

          <Text variant="bodyMedium" style={[styles.privacyLabel, { color: theme.colors.onSurfaceVariant }]}>
            Who can find you?
          </Text>
          <Menu
            visible={findMeVisible}
            onDismiss={() => setFindMeVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setFindMeVisible(true)}
                style={styles.menuButton}
                contentStyle={styles.menuButtonContent}
                icon="chevron-down"
              >
                {getFindMeLabel(findMePrivacy)}
              </Button>
            }
          >
            <Menu.Item
              onPress={() => {
                setFindMePrivacy('everyone');
                setFindMeVisible(false);
              }}
              title="Everyone"
            />
            <Menu.Item
              onPress={() => {
                setFindMePrivacy('friends');
                setFindMeVisible(false);
              }}
              title="Friends Only"
            />
            <Menu.Item
              onPress={() => {
                setFindMePrivacy('nobody');
                setFindMeVisible(false);
              }}
              title="Nobody"
            />
          </Menu>

          <Text variant="bodyMedium" style={[styles.privacyLabel, { color: theme.colors.onSurfaceVariant }]}>
            Who can see your steps?
          </Text>
          <Menu
            visible={showStepsVisible}
            onDismiss={() => setShowStepsVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setShowStepsVisible(true)}
                style={styles.menuButton}
                contentStyle={styles.menuButtonContent}
                icon="chevron-down"
              >
                {getActivityLabel(showStepsPrivacy)}
              </Button>
            }
          >
            <Menu.Item
              onPress={() => {
                setShowStepsPrivacy('public');
                setShowStepsVisible(false);
              }}
              title="Everyone"
            />
            <Menu.Item
              onPress={() => {
                setShowStepsPrivacy('friends');
                setShowStepsVisible(false);
              }}
              title="Friends Only"
            />
            <Menu.Item
              onPress={() => {
                setShowStepsPrivacy('private');
                setShowStepsVisible(false);
              }}
              title="Nobody"
            />
          </Menu>
        </View>

        {error && (
          <HelperText type="error" visible={true}>
            {error}
          </HelperText>
        )}

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleFinish}
            loading={isSaving}
            disabled={isSaving}
            style={styles.finishButton}
          >
            Finish Setup
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
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  goalValue: {
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  privacyLabel: {
    marginBottom: 8,
    marginTop: 16,
  },
  menuButton: {
    marginBottom: 8,
  },
  menuButtonContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  footer: {
    marginTop: 16,
  },
  finishButton: {
    marginBottom: 12,
  },
});

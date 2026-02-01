import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, Button, Card, IconButton } from 'react-native-paper';
import { OnboardingStackScreenProps } from '@navigation/types';
import { useAppTheme } from '@hooks/useAppTheme';
import { useAnalyticsStore } from '@store/analyticsStore';
import { track } from '@services/analytics';
import { urlConfig } from '@config/urls.config';
import OnboardingLayout from './components/OnboardingLayout';

type Props = OnboardingStackScreenProps<'AnalyticsConsent'>;

export default function AnalyticsConsentScreen({ navigation }: Props) {
  const { paperTheme } = useAppTheme();
  const [isLoading, setIsLoading] = useState(false);
  const grantConsent = useAnalyticsStore((state) => state.grantConsent);
  const revokeConsent = useAnalyticsStore((state) => state.revokeConsent);
  const hasTrackedStep = useRef(false);

  // Track analytics consent step on mount (step 2 in onboarding flow)
  useEffect(() => {
    if (!hasTrackedStep.current) {
      track('onboarding_step_completed', { step_number: 2, step_name: 'analytics_consent' });
      hasTrackedStep.current = true;
    }
  }, []);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await grantConsent();
      navigation.navigate('Permissions');
    } catch (error) {
      console.error('Error granting consent:', error);
      // Continue anyway - user can change later
      navigation.navigate('Permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      await revokeConsent();
      navigation.navigate('Permissions');
    } catch (error) {
      console.error('Error revoking consent:', error);
      // Continue anyway
      navigation.navigate('Permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL(urlConfig.privacyPolicy).catch(() => {
      console.error('Failed to open privacy policy');
    });
  };

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text variant="labelLarge" style={{ color: paperTheme.colors.primary }}>
            Back
          </Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconButton
              icon="chart-bar"
              size={64}
              iconColor={paperTheme.colors.primary}
              style={styles.iconButton}
            />
          </View>

          <Text variant="headlineMedium" style={[styles.title, { color: paperTheme.colors.onBackground }]}>
            Help Us Improve Stepper
          </Text>

          <Text variant="bodyLarge" style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
            We collect anonymous usage data to understand how you use the app and improve your experience.
          </Text>

          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                What we collect:
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Text style={[styles.bullet, { color: paperTheme.colors.primary }]}>*</Text>
                  <Text variant="bodyMedium" style={[styles.bulletText, { color: paperTheme.colors.onSurfaceVariant }]}>
                    App usage patterns (screens viewed, features used)
                  </Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={[styles.bullet, { color: paperTheme.colors.primary }]}>*</Text>
                  <Text variant="bodyMedium" style={[styles.bulletText, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Device type and app version
                  </Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={[styles.bullet, { color: paperTheme.colors.primary }]}>*</Text>
                  <Text variant="bodyMedium" style={[styles.bulletText, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Performance and crash reports
                  </Text>
                </View>
              </View>

              <Text variant="titleMedium" style={[styles.cardTitle, styles.cardTitleSpacing, { color: paperTheme.colors.onSurface }]}>
                What we never collect:
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Text style={[styles.bullet, { color: paperTheme.colors.error }]}>X</Text>
                  <Text variant="bodyMedium" style={[styles.bulletText, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Your personal health data
                  </Text>
                </View>

                <View style={styles.bulletItem}>
                  <Text style={[styles.bullet, { color: paperTheme.colors.error }]}>X</Text>
                  <Text variant="bodyMedium" style={[styles.bulletText, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Location or contact information
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <TouchableOpacity onPress={handlePrivacyPolicy} style={styles.privacyLink}>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.primary }}>
              Read our Privacy Policy
            </Text>
          </TouchableOpacity>

          <Text variant="bodySmall" style={[styles.note, { color: paperTheme.colors.onSurfaceVariant }]}>
            You can change this setting anytime in Settings.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleAccept}
            style={styles.button}
            contentStyle={styles.buttonContent}
            loading={isLoading}
            disabled={isLoading}
            testID="analytics-consent-accept"
          >
            Accept
          </Button>
          <Button
            mode="outlined"
            onPress={handleDecline}
            style={styles.button}
            contentStyle={styles.buttonContent}
            disabled={isLoading}
            testID="analytics-consent-decline"
          >
            No Thanks
          </Button>
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconButton: {
    margin: 0,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  cardTitleSpacing: {
    marginTop: 16,
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    marginRight: 12,
    width: 16,
    fontWeight: '600',
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  privacyLink: {
    alignSelf: 'center',
    padding: 8,
    marginBottom: 8,
  },
  note: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    paddingTop: 16,
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

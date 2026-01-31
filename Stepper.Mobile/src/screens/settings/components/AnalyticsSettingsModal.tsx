import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Linking, Alert } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  Switch,
  IconButton,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { useAnalyticsStore, selectHasConsent } from '@store/analyticsStore';
import { deleteAnalyticsData } from '@services/analytics/analyticsService';
import { urlConfig } from '@config/urls.config';

interface AnalyticsSettingsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}

/**
 * Modal for managing analytics settings.
 * Allows users to toggle analytics consent and delete their data.
 */
export function AnalyticsSettingsModal({
  visible,
  onDismiss,
  onSaved,
}: AnalyticsSettingsModalProps) {
  const theme = useTheme();
  const hasConsent = useAnalyticsStore(selectHasConsent);
  const grantConsent = useAnalyticsStore((state) => state.grantConsent);
  const revokeConsent = useAnalyticsStore((state) => state.revokeConsent);

  const [isEnabled, setIsEnabled] = useState(hasConsent);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state when modal opens or consent changes
  useEffect(() => {
    if (visible) {
      setIsEnabled(hasConsent);
    }
  }, [visible, hasConsent]);

  const handleToggle = useCallback(async (value: boolean) => {
    setIsEnabled(value);
    setIsLoading(true);
    try {
      if (value) {
        await grantConsent();
      } else {
        await revokeConsent();
      }
      onSaved();
    } catch (error) {
      console.error('Error toggling analytics consent:', error);
      // Revert the toggle on error
      setIsEnabled(!value);
    } finally {
      setIsLoading(false);
    }
  }, [grantConsent, revokeConsent, onSaved]);

  const handleDeleteData = useCallback(() => {
    Alert.alert(
      'Delete Analytics Data',
      'This will clear all locally stored analytics data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAnalyticsData();
              Alert.alert('Success', 'Analytics data has been deleted.');
              onSaved();
            } catch (error) {
              console.error('Error deleting analytics data:', error);
              Alert.alert('Error', 'Failed to delete analytics data. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [onSaved]);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL(urlConfig.privacyPolicy).catch(() => {
      Alert.alert('Error', 'Unable to open Privacy Policy');
    });
  }, []);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            Analytics Settings
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
            testID="analytics-modal-close"
          />
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          Help improve Stepper by sharing anonymous usage data. We never collect personal health information.
        </Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              Share Analytics
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Allow anonymous usage tracking
            </Text>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              testID="analytics-toggle"
              accessibilityLabel={`Analytics toggle, currently ${isEnabled ? 'enabled' : 'disabled'}`}
            />
          )}
        </View>

        <View style={styles.divider} />

        <Button
          mode="text"
          onPress={handlePrivacyPolicy}
          style={styles.linkButton}
          contentStyle={styles.linkButtonContent}
          icon="open-in-new"
          testID="analytics-privacy-link"
        >
          Privacy Policy
        </Button>

        <Button
          mode="text"
          onPress={handleDeleteData}
          loading={isDeleting}
          disabled={isDeleting}
          textColor={theme.colors.error}
          style={styles.linkButton}
          contentStyle={styles.linkButtonContent}
          icon="delete"
          testID="analytics-delete-data"
        >
          Delete My Analytics Data
        </Button>

        <Text
          variant="bodySmall"
          style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
        >
          Deleting data clears locally stored analytics. Data already sent to our servers may take up to 90 days to be fully removed.
        </Text>

        <Button
          mode="contained"
          onPress={onDismiss}
          style={styles.doneButton}
          testID="analytics-done-button"
        >
          Done
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: '600',
  },
  description: {
    marginBottom: 20,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleContent: {
    flex: 1,
    marginRight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  linkButton: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  linkButtonContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
  },
  note: {
    marginTop: 16,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  doneButton: {
    marginTop: 20,
    borderRadius: 8,
  },
});

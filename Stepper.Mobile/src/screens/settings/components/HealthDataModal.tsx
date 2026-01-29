import React, { useCallback } from 'react';
import { View, StyleSheet, Alert, Linking, Platform } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  IconButton,
  Switch,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useStepTracking } from '@hooks/useStepTracking';

interface HealthDataModalProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Modal for managing health data tracking settings.
 * Allows users to enable/disable health tracking and view sync status.
 */
export function HealthDataModal({ visible, onDismiss }: HealthDataModalProps) {
  const theme = useTheme();
  const {
    isAvailable,
    isEnabled,
    isSyncing,
    syncState,
    error,
    enable,
    disable,
    syncNow,
  } = useStepTracking();

  const handleToggle = useCallback(async () => {
    if (isEnabled) {
      // Show confirmation before disabling
      Alert.alert(
        'Disable Health Tracking',
        'This will remove all synced health data. You can still enter steps manually. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disable();
            },
          },
        ]
      );
    } else {
      const result = await enable();
      if (result.status === 'denied') {
        Alert.alert(
          'Permission Required',
          'Health access was denied. Would you like to open Settings to enable it?',
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
  }, [isEnabled, enable, disable]);

  const handleSyncNow = useCallback(async () => {
    await syncNow();
  }, [syncNow]);

  const formatLastSync = (): string => {
    if (!syncState?.lastSyncTimestamp) return 'Never';

    const date = new Date(syncState.lastSyncTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getPlatformLabel = (): string => {
    if (Platform.OS === 'ios') return 'Apple Health';
    if (Platform.OS === 'android') return 'Google Fit';
    return 'Health Tracking';
  };

  const getStatusDescription = (): string => {
    if (!isAvailable) return 'Not available on this device';
    if (isEnabled) return `Connected to ${getPlatformLabel()}`;
    return 'Not connected';
  };

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
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            Health Data
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
            testID="health-data-modal-close"
          />
        </View>

        <Divider style={styles.divider} />

        {!isAvailable ? (
          <View style={styles.unavailableContainer}>
            <Text variant="bodyMedium" style={styles.unavailableText}>
              Health tracking is not available on this device.
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              You can still enter steps manually.
            </Text>
          </View>
        ) : (
          <>
            {/* Enable/Disable Toggle */}
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  Automatic Step Tracking
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {getStatusDescription()}
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={handleToggle}
                disabled={isSyncing}
                testID="health-data-toggle"
                accessibilityLabel={`Automatic step tracking toggle, currently ${isEnabled ? 'enabled' : 'disabled'}`}
              />
            </View>

            {/* Sync Status (only when enabled) */}
            {isEnabled && (
              <>
                <Divider style={styles.divider} />

                <View style={styles.syncInfo}>
                  <View style={styles.syncRow}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                      Last synced
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {formatLastSync()}
                    </Text>
                  </View>

                  {syncState?.lastSyncStatus === 'failed' && (
                    <Text
                      variant="bodySmall"
                      style={[styles.errorText, { color: theme.colors.error }]}
                    >
                      Last sync failed. Tap "Sync Now" to try again.
                    </Text>
                  )}

                  <Button
                    mode="outlined"
                    onPress={handleSyncNow}
                    loading={isSyncing}
                    disabled={isSyncing}
                    style={styles.syncButton}
                    icon="sync"
                    testID="health-data-sync-now"
                    accessibilityLabel="Sync health data now"
                  >
                    Sync Now
                  </Button>
                </View>

                {/* Info Section */}
                <Divider style={styles.divider} />

                <View style={styles.infoSection}>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Steps are automatically synced from {getPlatformLabel()} in the
                    background approximately every 2 hours.
                  </Text>
                </View>
              </>
            )}

            {/* Error Display */}
            {error && (
              <Text
                variant="bodySmall"
                style={[styles.errorText, { color: theme.colors.error }]}
                testID="health-data-error"
              >
                {error}
              </Text>
            )}
          </>
        )}
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
  divider: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowContent: {
    flex: 1,
    marginRight: 16,
  },
  unavailableContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  unavailableText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  syncInfo: {
    paddingVertical: 8,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncButton: {
    marginTop: 12,
    borderRadius: 8,
  },
  infoSection: {
    paddingVertical: 8,
  },
  errorText: {
    marginTop: 8,
  },
});

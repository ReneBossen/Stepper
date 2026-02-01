import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  IconButton,
  useTheme,
  ActivityIndicator,
  MD3Theme,
} from 'react-native-paper';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { usersApi } from '@services/api/usersApi';
import { track } from '@services/analytics';
import { getErrorMessage } from '@utils/errorUtils';

interface DataExportModalProps {
  visible: boolean;
  onDismiss: () => void;
  onExported?: () => void;
}

/**
 * Modal for downloading user data for GDPR data portability compliance.
 * Exports all personal data as a JSON file via the native share sheet.
 */
export function DataExportModal({
  visible,
  onDismiss,
  onExported,
}: DataExportModalProps) {
  const theme = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generates a filename with the current date.
   */
  const generateFilename = useCallback((): string => {
    const date = new Date().toISOString().split('T')[0];
    return `stepper-data-export-${date}.json`;
  }, []);

  /**
   * Handles the export process:
   * 1. Fetches data from the API
   * 2. Writes to a temporary file
   * 3. Opens the native share sheet
   */
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    // Track export started
    track('data_export_requested', { export_status: 'started' });

    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      // Fetch user data from API
      const exportData = await usersApi.downloadMyData();

      // Convert to formatted JSON string
      const jsonString = JSON.stringify(exportData, null, 2);

      // Generate file path in cache directory
      const filename = generateFilename();
      const filePath = `${FileSystem.cacheDirectory}${filename}`;

      // Write JSON to file
      await FileSystem.writeAsStringAsync(filePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Open native share sheet
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export My Data',
        UTI: 'public.json',
      });

      // Track export completed
      track('data_export_requested', { export_status: 'completed' });

      // Clean up: delete the temporary file after sharing
      try {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      } catch {
        // Ignore cleanup errors
      }

      onExported?.();
      onDismiss();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);

      // Track export failed
      track('data_export_requested', {
        export_status: 'failed',
        error_message: errorMessage,
      });
    } finally {
      setIsExporting(false);
    }
  }, [generateFilename, onDismiss, onExported]);

  /**
   * Handles retry after an error.
   */
  const handleRetry = useCallback(() => {
    setError(null);
    handleExport();
  }, [handleExport]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={isExporting ? undefined : onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            Download My Data
          </Text>
          {!isExporting && (
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              iconColor={theme.colors.onSurfaceVariant}
              testID="data-export-modal-close"
            />
          )}
        </View>

        {isExporting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              variant="bodyMedium"
              style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}
            >
              Preparing your data export...
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.loadingSubtext, { color: theme.colors.onSurfaceVariant }]}
            >
              This may take a moment depending on your data volume.
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text
              variant="bodyMedium"
              style={[styles.errorText, { color: theme.colors.error }]}
            >
              {error}
            </Text>
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                style={styles.button}
                testID="data-export-cancel-button"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleRetry}
                style={styles.button}
                testID="data-export-retry-button"
              >
                Retry
              </Button>
            </View>
          </View>
        ) : (
          <>
            <Text
              variant="bodyMedium"
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
            >
              Export a copy of all your personal data stored in Stepper. This includes:
            </Text>

            <View style={styles.dataList}>
              <DataItem icon="account" text="Profile information" theme={theme} />
              <DataItem icon="cog" text="Your preferences and settings" theme={theme} />
              <DataItem icon="shoe-print" text="Step history" theme={theme} />
              <DataItem icon="account-group" text="Friends and social connections" theme={theme} />
              <DataItem icon="account-multiple" text="Group memberships" theme={theme} />
              <DataItem icon="bell" text="Notifications" theme={theme} />
            </View>

            <Text
              variant="bodySmall"
              style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
            >
              Your data will be exported as a JSON file that you can save or share.
              {Platform.OS === 'ios' && ' You can save it to Files, AirDrop, or share via other apps.'}
              {Platform.OS === 'android' && ' You can save it to your device or share via other apps.'}
            </Text>

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                style={styles.button}
                testID="data-export-cancel-button"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleExport}
                style={styles.button}
                icon="download"
                testID="data-export-button"
              >
                Export My Data
              </Button>
            </View>
          </>
        )}
      </Modal>
    </Portal>
  );
}

/**
 * Helper component for displaying data items in the list.
 */
interface DataItemProps {
  icon: string;
  text: string;
  theme: MD3Theme;
}

function DataItem({ icon, text, theme }: DataItemProps) {
  return (
    <View style={styles.dataItem}>
      <IconButton
        icon={icon}
        size={20}
        iconColor={theme.colors.primary}
        style={styles.dataIcon}
      />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
        {text}
      </Text>
    </View>
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
    marginBottom: 16,
    lineHeight: 20,
  },
  dataList: {
    marginBottom: 16,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dataIcon: {
    margin: 0,
    marginRight: 8,
  },
  note: {
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    paddingVertical: 16,
  },
  errorText: {
    marginBottom: 20,
    textAlign: 'center',
  },
});

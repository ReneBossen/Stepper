import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  RadioButton,
  IconButton,
  useTheme,
} from 'react-native-paper';
import type { ThemePreference } from '@store/userStore';

interface ThemeModalProps {
  visible: boolean;
  currentTheme: ThemePreference;
  onDismiss: () => void;
  onSave: (theme: ThemePreference) => void;
}

/**
 * Modal for selecting the app theme (light, dark, or system default).
 */
export function ThemeModal({
  visible,
  currentTheme,
  onDismiss,
  onSave,
}: ThemeModalProps) {
  const theme = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(currentTheme);

  // Reset selection when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedTheme(currentTheme);
    }
  }, [visible, currentTheme]);

  const handleSave = useCallback(() => {
    onSave(selectedTheme);
    onDismiss();
  }, [selectedTheme, onSave, onDismiss]);

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
            Theme
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
            testID="theme-modal-close"
          />
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          Choose your app theme
        </Text>

        <RadioButton.Group
          onValueChange={(value) => setSelectedTheme(value as ThemePreference)}
          value={selectedTheme}
        >
          <View
            style={[
              styles.radioOption,
              selectedTheme === 'light' && { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <RadioButton.Item
              label="Light"
              value="light"
              style={styles.radioItem}
              labelStyle={[styles.radioLabel, { color: theme.colors.onSurface }]}
              testID="theme-light-radio"
              accessibilityLabel="Light theme, always use light mode"
            />
            <Text
              variant="bodySmall"
              style={[styles.radioDescription, { color: theme.colors.onSurfaceVariant }]}
            >
              Always use light mode
            </Text>
          </View>

          <View
            style={[
              styles.radioOption,
              selectedTheme === 'dark' && { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <RadioButton.Item
              label="Dark"
              value="dark"
              style={styles.radioItem}
              labelStyle={[styles.radioLabel, { color: theme.colors.onSurface }]}
              testID="theme-dark-radio"
              accessibilityLabel="Dark theme, always use dark mode"
            />
            <Text
              variant="bodySmall"
              style={[styles.radioDescription, { color: theme.colors.onSurfaceVariant }]}
            >
              Always use dark mode
            </Text>
          </View>

          <View
            style={[
              styles.radioOption,
              selectedTheme === 'system' && { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <RadioButton.Item
              label="System Default"
              value="system"
              style={styles.radioItem}
              labelStyle={[styles.radioLabel, { color: theme.colors.onSurface }]}
              testID="theme-system-radio"
              accessibilityLabel="System default theme, match device theme"
            />
            <Text
              variant="bodySmall"
              style={[styles.radioDescription, { color: theme.colors.onSurfaceVariant }]}
            >
              Match device theme
            </Text>
          </View>
        </RadioButton.Group>

        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          testID="theme-save-button"
          accessibilityLabel="Save theme preference"
        >
          Save
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
  },
  radioOption: {
    borderRadius: 12,
    marginBottom: 12,
    paddingBottom: 12,
  },
  radioItem: {
    paddingVertical: 8,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  radioDescription: {
    marginLeft: 52,
    marginTop: -8,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 8,
  },
});

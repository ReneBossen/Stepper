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
import type { PrivacyLevel } from '@services/api/userPreferencesApi';

export type PrivacySettingType = 'profile_visibility' | 'activity_visibility' | 'find_me';

interface PrivacyModalProps {
  visible: boolean;
  settingType: PrivacySettingType;
  currentValue: PrivacyLevel;
  onDismiss: () => void;
  onSave: (value: PrivacyLevel) => void;
  isSaving?: boolean;
}

const SETTING_CONFIGS: Record<PrivacySettingType, {
  title: string;
  description: string;
  options: Array<{ value: PrivacyLevel; label: string; description: string }>;
}> = {
  profile_visibility: {
    title: 'Profile Visibility',
    description: 'Who can see your profile',
    options: [
      { value: 'public', label: 'Public', description: 'Anyone can see your profile' },
      { value: 'partial', label: 'Friends Only', description: 'Only friends can see your profile' },
      { value: 'private', label: 'Private', description: 'Nobody can see your profile' },
    ],
  },
  activity_visibility: {
    title: 'Activity Visibility',
    description: 'Who can see your step activity',
    options: [
      { value: 'public', label: 'Public', description: 'Anyone can see your activity' },
      { value: 'partial', label: 'Friends Only', description: 'Only friends can see your activity' },
      { value: 'private', label: 'Private', description: 'Nobody can see your activity' },
    ],
  },
  find_me: {
    title: 'Who Can Find Me',
    description: 'Who can find you in search',
    options: [
      { value: 'public', label: 'Everyone', description: 'Anyone can find you' },
      { value: 'partial', label: 'Friends of Friends', description: 'Only friends of friends can find you' },
      { value: 'private', label: 'Nobody', description: 'You will not appear in search results' },
    ],
  },
};

/**
 * Modal for selecting privacy settings.
 */
export function PrivacyModal({
  visible,
  settingType,
  currentValue,
  onDismiss,
  onSave,
  isSaving = false,
}: PrivacyModalProps) {
  const theme = useTheme();
  const [selectedValue, setSelectedValue] = useState<PrivacyLevel>(currentValue);

  const config = SETTING_CONFIGS[settingType];

  // Reset selection when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedValue(currentValue);
    }
  }, [visible, currentValue]);

  const handleSave = useCallback(() => {
    onSave(selectedValue);
  }, [selectedValue, onSave]);

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
            {config.title}
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
            testID="privacy-modal-close"
          />
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {config.description}
        </Text>

        <RadioButton.Group
          onValueChange={(value) => setSelectedValue(value as PrivacyLevel)}
          value={selectedValue}
        >
          {config.options.map((option) => (
            <View
              key={option.value}
              style={[
                styles.radioOption,
                selectedValue === option.value && { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <RadioButton.Item
                label={option.label}
                value={option.value}
                style={styles.radioItem}
                labelStyle={[styles.radioLabel, { color: theme.colors.onSurface }]}
                testID={`privacy-${settingType}-${option.value}-radio`}
                accessibilityLabel={`${option.label}, ${option.description}`}
              />
              <Text
                variant="bodySmall"
                style={[styles.radioDescription, { color: theme.colors.onSurfaceVariant }]}
              >
                {option.description}
              </Text>
            </View>
          ))}
        </RadioButton.Group>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          style={styles.saveButton}
          testID="privacy-save-button"
          accessibilityLabel="Save privacy setting"
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

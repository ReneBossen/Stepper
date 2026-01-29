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

interface UnitsModalProps {
  visible: boolean;
  currentUnits: 'metric' | 'imperial';
  onDismiss: () => void;
  onSave: (units: 'metric' | 'imperial') => void;
  isSaving?: boolean;
}

/**
 * Modal for selecting the preferred unit system (metric or imperial).
 */
export function UnitsModal({
  visible,
  currentUnits,
  onDismiss,
  onSave,
  isSaving = false,
}: UnitsModalProps) {
  const theme = useTheme();
  const [selectedUnits, setSelectedUnits] = useState<'metric' | 'imperial'>(currentUnits);

  // Reset selection when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedUnits(currentUnits);
    }
  }, [visible, currentUnits]);

  const handleSave = useCallback(() => {
    onSave(selectedUnits);
  }, [selectedUnits, onSave]);

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
            Units
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
            testID="units-modal-close"
          />
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          Choose your preferred unit system
        </Text>

        <RadioButton.Group
          onValueChange={(value) => setSelectedUnits(value as 'metric' | 'imperial')}
          value={selectedUnits}
        >
          <View
            style={[
              styles.radioOption,
              selectedUnits === 'metric' && { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <RadioButton.Item
              label="Metric (km)"
              value="metric"
              style={styles.radioItem}
              labelStyle={[styles.radioLabel, { color: theme.colors.onSurface }]}
              testID="units-metric-radio"
              accessibilityLabel="Metric units, distance in kilometers"
            />
            <Text
              variant="bodySmall"
              style={[styles.radioDescription, { color: theme.colors.onSurfaceVariant }]}
            >
              Distance in kilometers
            </Text>
          </View>

          <View
            style={[
              styles.radioOption,
              selectedUnits === 'imperial' && { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <RadioButton.Item
              label="Imperial (miles)"
              value="imperial"
              style={styles.radioItem}
              labelStyle={[styles.radioLabel, { color: theme.colors.onSurface }]}
              testID="units-imperial-radio"
              accessibilityLabel="Imperial units, distance in miles"
            />
            <Text
              variant="bodySmall"
              style={[styles.radioDescription, { color: theme.colors.onSurfaceVariant }]}
            >
              Distance in miles
            </Text>
          </View>
        </RadioButton.Group>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          style={styles.saveButton}
          testID="units-save-button"
          accessibilityLabel="Save units preference"
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

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  IconButton,
  Chip,
  useTheme,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';

interface DailyGoalModalProps {
  visible: boolean;
  currentGoal: number;
  onDismiss: () => void;
  onSave: (goal: number) => void;
  isSaving?: boolean;
}

const PRESET_GOALS = [5000, 8000, 10000, 12000, 15000, 20000];
const MIN_GOAL = 1000;
const MAX_GOAL = 50000;

/**
 * Modal for adjusting the daily step goal with a slider and preset buttons.
 */
export function DailyGoalModal({
  visible,
  currentGoal,
  onDismiss,
  onSave,
  isSaving = false,
}: DailyGoalModalProps) {
  const theme = useTheme();
  const [selectedGoal, setSelectedGoal] = useState(currentGoal);

  // Reset selection when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedGoal(currentGoal);
    }
  }, [visible, currentGoal]);

  const handleSave = useCallback(() => {
    onSave(selectedGoal);
  }, [selectedGoal, onSave]);

  const handlePresetPress = useCallback((preset: number) => {
    setSelectedGoal(preset);
  }, []);

  const formatNumber = (value: number) => {
    return value.toLocaleString();
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
        <View style={styles.header}>
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            Daily Step Goal
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
            testID="daily-goal-modal-close"
          />
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          Set your daily step target
        </Text>

        {/* Goal Display */}
        <View style={[styles.goalDisplay, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text
            variant="displaySmall"
            style={[styles.goalValue, { color: theme.colors.onPrimaryContainer }]}
          >
            {formatNumber(selectedGoal)}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onPrimaryContainer }}
          >
            steps
          </Text>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={MIN_GOAL}
            maximumValue={MAX_GOAL}
            step={1000}
            value={selectedGoal}
            onValueChange={setSelectedGoal}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surfaceVariant}
            thumbTintColor={theme.colors.primary}
            testID="daily-goal-slider"
            accessibilityLabel={`Daily step goal slider, current value ${formatNumber(selectedGoal)} steps`}
          />
          <View style={styles.sliderLabels}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatNumber(MIN_GOAL)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatNumber(MAX_GOAL)}
            </Text>
          </View>
        </View>

        {/* Preset Goals */}
        <Text
          variant="titleSmall"
          style={[styles.presetTitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Common Goals:
        </Text>
        <View style={styles.presetContainer}>
          {PRESET_GOALS.map((preset) => (
            <Chip
              key={preset}
              selected={selectedGoal === preset}
              onPress={() => handlePresetPress(preset)}
              style={styles.presetChip}
              textStyle={styles.presetChipText}
              testID={`preset-goal-${preset}`}
              accessibilityLabel={`Set goal to ${formatNumber(preset)} steps`}
            >
              {formatNumber(preset)}
            </Chip>
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          style={styles.saveButton}
          testID="daily-goal-save-button"
          accessibilityLabel="Save daily step goal"
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
  goalDisplay: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  goalValue: {
    fontWeight: '700',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  presetTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    marginBottom: 4,
  },
  presetChipText: {
    fontSize: 14,
  },
  saveButton: {
    borderRadius: 8,
  },
});

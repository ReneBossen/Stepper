import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform, Keyboard, ScrollView, TouchableWithoutFeedback } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  IconButton,
  TextInput,
  HelperText,
  useTheme,
  Divider,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useManualStepEntry, ManualEntryMode } from '@screens/steps/hooks/useManualStepEntry';
import { useUserStore } from '@store/userStore';
import {
  estimateDistanceFromSteps,
  formatDistance,
  convertToMeters,
} from '@utils/stepEstimation';

/** Storage key for persisting entry mode preference */
const ENTRY_MODE_STORAGE_KEY = '@stepper/manual_step_entry_mode';

interface ManualStepEntryModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when the modal is dismissed */
  onDismiss: () => void;
  /** Callback when entry is successfully saved */
  onSuccess?: () => void;
  /** Initial date to pre-populate (defaults to today) */
  initialDate?: Date;
}

/**
 * Modal component for manually entering step data.
 * Allows users to input step count, optional distance, and date.
 * Follows the pattern established by DailyGoalModal.
 */
export function ManualStepEntryModal({
  visible,
  onDismiss,
  onSuccess,
  initialDate,
}: ManualStepEntryModalProps) {
  const theme = useTheme();
  const units = useUserStore((state) => state.currentUser?.preferences?.units ?? 'metric');
  const {
    submitEntry,
    validateEntry,
    checkExistingEntry,
    clearExistingEntry,
    existingEntry,
    isLoadingExisting,
    isSubmitting,
    error,
    clearError,
  } = useManualStepEntry();

  // Form state
  const [stepCount, setStepCount] = useState('');
  const [distance, setDistance] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate ?? new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ steps?: string; distance?: string; date?: string }>({});
  const [entryMode, setEntryMode] = useState<ManualEntryMode>('override');

  // Load saved entry mode preference and reset form when modal opens
  useEffect(() => {
    if (visible) {
      setStepCount('');
      setDistance('');
      setSelectedDate(initialDate ?? new Date());
      setErrors({});
      clearError();
      clearExistingEntry();

      // Load saved mode preference
      AsyncStorage.getItem(ENTRY_MODE_STORAGE_KEY).then((savedMode) => {
        if (savedMode === 'override' || savedMode === 'add') {
          setEntryMode(savedMode);
        }
      });

      // Check for existing entry for the initial date
      checkExistingEntry(initialDate ?? new Date());
    }
  }, [visible, initialDate, clearError, clearExistingEntry, checkExistingEntry]);

  // Check for existing entry when date changes
  useEffect(() => {
    if (visible) {
      checkExistingEntry(selectedDate);
    }
  }, [selectedDate, visible, checkExistingEntry]);

  // Save entry mode preference when it changes
  const handleEntryModeChange = useCallback((value: string) => {
    const mode = value as ManualEntryMode;
    setEntryMode(mode);
    AsyncStorage.setItem(ENTRY_MODE_STORAGE_KEY, mode);
  }, []);

  // Calculate estimated distance for display
  const estimatedDistance = stepCount
    ? formatDistance(estimateDistanceFromSteps(parseInt(stepCount, 10) || 0), units)
    : null;

  const handleStepCountChange = useCallback((text: string) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setStepCount(cleaned);
    // Clear step error when user starts typing
    setErrors((prev) => ({ ...prev, steps: undefined }));
  }, []);

  const handleDistanceChange = useCallback((text: string) => {
    // Allow digits and single decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setDistance(sanitized);
    // Clear distance error when user starts typing
    setErrors((prev) => ({ ...prev, distance: undefined }));
  }, []);

  const handleDateChange = useCallback(
    (_event: DateTimePickerEvent, date?: Date) => {
      // On Android, the picker closes automatically
      // On iOS, we need to keep it open until user dismisses
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
      if (date) {
        setSelectedDate(date);
        // Clear date error when user selects a date
        setErrors((prev) => ({ ...prev, date: undefined }));
      }
    },
    []
  );

  const handleDatePickerDismiss = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleSave = useCallback(async () => {
    // Dismiss keyboard before processing
    Keyboard.dismiss();

    const steps = parseInt(stepCount, 10);
    const distanceValue = distance ? parseFloat(distance) : undefined;
    const distanceMeters = distanceValue !== undefined
      ? convertToMeters(distanceValue, units)
      : undefined;

    // Validate input
    const validationErrors = validateEntry(steps, selectedDate, distanceMeters);

    // Check for empty step count
    if (!stepCount) {
      validationErrors.steps = 'Please enter your step count';
    }

    // If there are validation errors, show them and don't submit
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Submit the entry with the selected mode
    const result = await submitEntry(steps, selectedDate, distanceMeters, entryMode);

    if (result.success) {
      onSuccess?.();
      onDismiss();
    }
  }, [stepCount, distance, selectedDate, units, entryMode, validateEntry, submitEntry, onSuccess, onDismiss]);

  /**
   * Formats the date for display in the button.
   */
  const formatDateDisplay = (date: Date): string => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return `Today - ${date.toLocaleDateString()}`;
    }

    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const unitLabel = units === 'metric' ? 'km' : 'mi';
  const isFormValid = stepCount && !errors.steps && !errors.distance && !errors.date;

  // Calculate date constraints
  const maximumDate = new Date();
  const minimumDate = new Date();
  minimumDate.setFullYear(minimumDate.getFullYear() - 1);

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
        <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
          <Text
            variant="titleLarge"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            Add Steps
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
            testID="manual-entry-modal-close"
          />
        </View>

        <Divider style={styles.divider} />

        {/* Date Picker */}
        <View style={styles.field}>
          <Text
            variant="labelLarge"
            style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
          >
            Date
          </Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            contentStyle={styles.dateButtonContent}
            icon="calendar"
            testID="manual-entry-date-button"
          >
            {formatDateDisplay(selectedDate)}
          </Button>
          {errors.date && (
            <HelperText type="error" visible={!!errors.date}>
              {errors.date}
            </HelperText>
          )}
        </View>

        {showDatePicker && (
          <>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              testID="manual-entry-date-picker"
            />
            {Platform.OS === 'ios' && (
              <Button
                mode="text"
                onPress={handleDatePickerDismiss}
                style={styles.datePickerDoneButton}
              >
                Done
              </Button>
            )}
          </>
        )}

        {/* Entry Mode Selection */}
        <View style={styles.field}>
          <Text
            variant="labelLarge"
            style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
          >
            Entry Mode
          </Text>
          <SegmentedButtons
            value={entryMode}
            onValueChange={handleEntryModeChange}
            buttons={[
              { value: 'override', label: 'Replace', testID: 'manual-entry-mode-override' },
              { value: 'add', label: 'Add to existing', testID: 'manual-entry-mode-add' },
            ]}
            style={styles.segmentedButtons}
          />
          <View style={styles.modeHelperContainer}>
            {isLoadingExisting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
                <Text
                  variant="bodySmall"
                  style={[styles.modeHelperText, { color: theme.colors.onSurfaceVariant }]}
                >
                  Checking existing entry...
                </Text>
              </View>
            ) : entryMode === 'override' ? (
              <Text
                variant="bodySmall"
                style={[styles.modeHelperText, { color: theme.colors.onSurfaceVariant }]}
              >
                This will replace any existing steps for this date
              </Text>
            ) : existingEntry ? (
              <Text
                variant="bodySmall"
                style={[styles.modeHelperText, { color: theme.colors.primary }]}
              >
                This will add to your existing {existingEntry.totalSteps.toLocaleString()} steps for this date
              </Text>
            ) : (
              <Text
                variant="bodySmall"
                style={[styles.modeHelperText, { color: theme.colors.onSurfaceVariant }]}
              >
                No existing entry for this date
              </Text>
            )}
          </View>
        </View>

        {/* Step Count Input */}
        <View style={styles.field}>
          <Text
            variant="labelLarge"
            style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
          >
            Steps *
          </Text>
          <TextInput
            mode="outlined"
            value={stepCount}
            onChangeText={handleStepCountChange}
            keyboardType="number-pad"
            placeholder="Enter step count"
            error={!!errors.steps}
            style={styles.input}
            testID="manual-entry-steps-input"
            accessibilityLabel="Step count input"
          />
          {errors.steps && (
            <HelperText type="error" visible={!!errors.steps}>
              {errors.steps}
            </HelperText>
          )}
        </View>

        {/* Distance Input (Optional) */}
        <View style={styles.field}>
          <Text
            variant="labelLarge"
            style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
          >
            Distance ({unitLabel})
          </Text>
          <TextInput
            mode="outlined"
            value={distance}
            onChangeText={handleDistanceChange}
            keyboardType="decimal-pad"
            placeholder={estimatedDistance ? `Estimated: ${estimatedDistance}` : 'Optional'}
            error={!!errors.distance}
            style={styles.input}
            testID="manual-entry-distance-input"
            accessibilityLabel="Distance input (optional)"
          />
          <HelperText type="info" visible={!distance && !!estimatedDistance}>
            Will use estimated distance if left empty
          </HelperText>
          {errors.distance && (
            <HelperText type="error" visible={!!errors.distance}>
              {errors.distance}
            </HelperText>
          )}
        </View>

        {/* API Error */}
        {error && (
          <HelperText type="error" visible={!!error} style={styles.apiError}>
            {error}
          </HelperText>
        )}

            {/* Save Button */}
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSubmitting}
              disabled={isSubmitting || !isFormValid}
              style={styles.saveButton}
              testID="manual-entry-save-button"
              accessibilityLabel="Save step entry"
            >
              Save Entry
            </Button>
          </ScrollView>
        </TouchableWithoutFeedback>
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
  },
  title: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'transparent',
  },
  dateButton: {
    justifyContent: 'flex-start',
  },
  dateButtonContent: {
    justifyContent: 'flex-start',
  },
  datePickerDoneButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  modeHelperContainer: {
    minHeight: 20,
  },
  modeHelperText: {
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  apiError: {
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 8,
  },
});

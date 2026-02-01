import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Portal,
  Modal,
  Button,
  Text,
  Chip,
  Divider,
  useTheme,
} from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';

interface DateRangePickerProps {
  visible: boolean;
  startDate: Date;
  endDate: Date;
  onDismiss: () => void;
  onConfirm: (startDate: Date, endDate: Date) => void;
  testID?: string;
}

/**
 * Formats a Date to a user-friendly display string.
 */
function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Sets time to start of day (00:00:00.000).
 */
function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Sets time to end of day (23:59:59.999).
 */
function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Gets the start of the current month.
 */
function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

type PresetKey = 'last7' | 'last30' | 'thisMonth';

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => { startDate: Date; endDate: Date };
}

const PRESETS: Preset[] = [
  {
    key: 'last7',
    label: 'Last 7 days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return { startDate: startOfDay(start), endDate: endOfDay(end) };
    },
  },
  {
    key: 'last30',
    label: 'Last 30 days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return { startDate: startOfDay(start), endDate: endOfDay(end) };
    },
  },
  {
    key: 'thisMonth',
    label: 'This month',
    getRange: () => {
      const end = new Date();
      const start = getStartOfMonth();
      return { startDate: startOfDay(start), endDate: endOfDay(end) };
    },
  },
];

/**
 * Modal dialog for selecting a custom date range.
 * Provides quick preset buttons and a calendar picker for custom ranges.
 */
export function DateRangePicker({
  visible,
  startDate,
  endDate,
  onDismiss,
  onConfirm,
  testID,
}: DateRangePickerProps) {
  const theme = useTheme();

  // Local state for the selected range (before applying)
  const [tempStartDate, setTempStartDate] = useState<Date>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date>(endDate);
  const [showCalendar, setShowCalendar] = useState(false);

  // Reset temp dates when modal opens
  React.useEffect(() => {
    if (visible) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      setShowCalendar(false);
    }
  }, [visible, startDate, endDate]);

  // Formatted display of the current range
  const rangeDisplay = useMemo(() => {
    return `${formatDateDisplay(tempStartDate)} - ${formatDateDisplay(tempEndDate)}`;
  }, [tempStartDate, tempEndDate]);

  // Handle preset selection - immediately confirms
  const handlePresetPress = useCallback(
    (preset: Preset) => {
      const { startDate: newStart, endDate: newEnd } = preset.getRange();
      onConfirm(newStart, newEnd);
    },
    [onConfirm]
  );

  // Open calendar picker
  const handleOpenCalendar = useCallback(() => {
    setShowCalendar(true);
  }, []);

  // Handle calendar dismiss
  const handleCalendarDismiss = useCallback(() => {
    setShowCalendar(false);
  }, []);

  // Handle calendar confirm
  const handleCalendarConfirm = useCallback(
    ({
      startDate: newStart,
      endDate: newEnd,
    }: {
      startDate: Date | undefined;
      endDate: Date | undefined;
    }) => {
      setShowCalendar(false);
      if (newStart && newEnd) {
        setTempStartDate(newStart);
        setTempEndDate(newEnd);
      } else if (newStart) {
        // If only start date selected, use it as both start and end
        setTempStartDate(newStart);
        setTempEndDate(newStart);
      }
    },
    []
  );

  // Handle apply button
  const handleApply = useCallback(() => {
    onConfirm(startOfDay(tempStartDate), endOfDay(tempEndDate));
  }, [tempStartDate, tempEndDate, onConfirm]);

  return (
    <>
      <Portal>
        <Modal
          visible={visible && !showCalendar}
          onDismiss={onDismiss}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
          testID={testID}
        >
          <Text
            variant="titleLarge"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            Select Date Range
          </Text>

          {/* Quick Presets */}
          <Text
            variant="titleSmall"
            style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Quick Select
          </Text>
          <View style={styles.presetContainer}>
            {PRESETS.map((preset) => (
              <Chip
                key={preset.key}
                mode="outlined"
                onPress={() => handlePresetPress(preset)}
                style={styles.presetChip}
                testID={testID ? `${testID}-preset-${preset.key}` : undefined}
                accessibilityLabel={`Select ${preset.label}`}
              >
                {preset.label}
              </Chip>
            ))}
          </View>

          <Divider style={styles.divider} />

          {/* Custom Range Section */}
          <Text
            variant="titleSmall"
            style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Custom Range
          </Text>

          {/* Current Range Display */}
          <View
            style={[
              styles.rangeDisplay,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              variant="bodyLarge"
              style={[styles.rangeText, { color: theme.colors.onSurfaceVariant }]}
              testID={testID ? `${testID}-range-display` : undefined}
            >
              {rangeDisplay}
            </Text>
          </View>

          <Button
            mode="outlined"
            onPress={handleOpenCalendar}
            icon="calendar"
            style={styles.pickDatesButton}
            testID={testID ? `${testID}-pick-dates-button` : undefined}
            accessibilityLabel="Open calendar to pick dates"
          >
            Pick Dates
          </Button>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Button
              mode="text"
              onPress={onDismiss}
              testID={testID ? `${testID}-cancel-button` : undefined}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleApply}
              testID={testID ? `${testID}-confirm-button` : undefined}
            >
              Apply
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Calendar Modal (separate from wrapper modal) */}
      <DatePickerModal
        locale="en"
        mode="range"
        visible={showCalendar}
        onDismiss={handleCalendarDismiss}
        startDate={tempStartDate}
        endDate={tempEndDate}
        onConfirm={handleCalendarConfirm}
        saveLabel="Select"
        label="Select date range"
        startLabel="From"
        endLabel="To"
        validRange={{
          endDate: new Date(), // Cannot select future dates
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 16,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: 12,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  presetChip: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  rangeDisplay: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  rangeText: {
    fontWeight: '500',
  },
  pickDatesButton: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  Portal,
  Modal,
  Button,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

interface DateRangePickerProps {
  visible: boolean;
  startDate: Date;
  endDate: Date;
  onDismiss: () => void;
  onConfirm: (startDate: Date, endDate: Date) => void;
  testID?: string;
}

/**
 * Formats a Date to YYYY-MM-DD string for input display.
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string to a Date object.
 * Returns null if the format is invalid.
 */
function parseDateString(dateStr: string): Date | null {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return null;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Validate the date is real (e.g., not Feb 30)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Modal dialog for selecting a custom date range.
 * Uses text inputs for date entry in YYYY-MM-DD format.
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

  const [startInput, setStartInput] = useState(formatDateForInput(startDate));
  const [endInput, setEndInput] = useState(formatDateForInput(endDate));
  const [startError, setStartError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);

  // Reset inputs when modal opens
  React.useEffect(() => {
    if (visible) {
      setStartInput(formatDateForInput(startDate));
      setEndInput(formatDateForInput(endDate));
      setStartError(null);
      setEndError(null);
    }
  }, [visible, startDate, endDate]);

  const handleConfirm = useCallback(() => {
    const parsedStart = parseDateString(startInput);
    const parsedEnd = parseDateString(endInput);

    let hasError = false;

    if (!parsedStart) {
      setStartError('Invalid date format (YYYY-MM-DD)');
      hasError = true;
    } else {
      setStartError(null);
    }

    if (!parsedEnd) {
      setEndError('Invalid date format (YYYY-MM-DD)');
      hasError = true;
    } else {
      setEndError(null);
    }

    if (hasError || !parsedStart || !parsedEnd) {
      return;
    }

    if (parsedStart > parsedEnd) {
      setStartError('Start date must be before end date');
      return;
    }

    // Set time boundaries
    parsedStart.setHours(0, 0, 0, 0);
    parsedEnd.setHours(23, 59, 59, 999);

    onConfirm(parsedStart, parsedEnd);
  }, [startInput, endInput, onConfirm]);

  const handleStartChange = useCallback((text: string) => {
    setStartInput(text);
    setStartError(null);
  }, []);

  const handleEndChange = useCallback((text: string) => {
    setEndInput(text);
    setEndError(null);
  }, []);

  return (
    <Portal>
      <Modal
        visible={visible}
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

        <View style={styles.inputContainer}>
          <TextInput
            label="Start Date"
            value={startInput}
            onChangeText={handleStartChange}
            mode="outlined"
            placeholder="YYYY-MM-DD"
            error={!!startError}
            testID={testID ? `${testID}-start-input` : undefined}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            autoCapitalize="none"
            style={styles.input}
          />
          {startError && (
            <Text
              variant="bodySmall"
              style={[styles.errorText, { color: theme.colors.error }]}
            >
              {startError}
            </Text>
          )}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            label="End Date"
            value={endInput}
            onChangeText={handleEndChange}
            mode="outlined"
            placeholder="YYYY-MM-DD"
            error={!!endError}
            testID={testID ? `${testID}-end-input` : undefined}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            autoCapitalize="none"
            style={styles.input}
          />
          {endError && (
            <Text
              variant="bodySmall"
              style={[styles.errorText, { color: theme.colors.error }]}
            >
              {endError}
            </Text>
          )}
        </View>

        <Text
          variant="bodySmall"
          style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
        >
          Enter dates in YYYY-MM-DD format (e.g., 2026-01-15)
        </Text>

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
            onPress={handleConfirm}
            testID={testID ? `${testID}-confirm-button` : undefined}
          >
            Apply
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 12,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    // TextInput handles its own styling
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
  hint: {
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});

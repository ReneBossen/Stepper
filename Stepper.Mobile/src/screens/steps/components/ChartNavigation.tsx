import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SegmentedButtons, IconButton, Text, useTheme } from 'react-native-paper';

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface ChartNavigationProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  periodLabel: string;
  testID?: string;
}

/**
 * Navigation component for the Steps History screen.
 * Provides view mode selection (Daily/Weekly/Monthly) and period navigation arrows.
 */
export function ChartNavigation({
  viewMode,
  onViewModeChange,
  onPrevious,
  onNext,
  canGoNext,
  periodLabel,
  testID,
}: ChartNavigationProps) {
  const theme = useTheme();

  const handleViewModeChange = (value: string) => {
    onViewModeChange(value as ViewMode);
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.topRow}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={handleViewModeChange}
          buttons={[
            {
              value: 'daily',
              label: 'Daily',
              testID: testID ? `${testID}-daily-button` : undefined,
            },
            {
              value: 'weekly',
              label: 'Weekly',
              testID: testID ? `${testID}-weekly-button` : undefined,
            },
            {
              value: 'monthly',
              label: 'Monthly',
              testID: testID ? `${testID}-monthly-button` : undefined,
            },
          ]}
          style={styles.segmentedButtons}
        />
        <View style={styles.arrowsContainer}>
          <IconButton
            icon="chevron-left"
            onPress={onPrevious}
            accessibilityLabel="View previous period"
            testID={testID ? `${testID}-prev-button` : undefined}
          />
          <IconButton
            icon="chevron-right"
            onPress={onNext}
            disabled={!canGoNext}
            accessibilityLabel="View next period"
            testID={testID ? `${testID}-next-button` : undefined}
          />
        </View>
      </View>
      <Text
        variant="bodyMedium"
        style={[styles.periodLabel, { color: theme.colors.onSurfaceVariant }]}
        testID={testID ? `${testID}-period-label` : undefined}
      >
        {periodLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentedButtons: {
    flex: 1,
  },
  arrowsContainer: {
    flexDirection: 'row',
  },
  periodLabel: {
    textAlign: 'center',
    marginTop: 8,
  },
});

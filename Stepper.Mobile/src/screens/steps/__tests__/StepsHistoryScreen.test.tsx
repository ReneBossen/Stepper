import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import StepsHistoryScreen from '../StepsHistoryScreen';
import { useStepsStore } from '@store/stepsStore';
import { useUserStore } from '@store/userStore';
import type { DailyStepEntry } from '@store/stepsStore';

// Mock dependencies
jest.mock('@store/stepsStore');
jest.mock('@store/userStore');

// Mock @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: ({ value, onChange, testID }: any) => (
      <RN.View testID={testID || 'date-time-picker'}>
        <RN.Text>{value?.toISOString()}</RN.Text>
      </RN.View>
    ),
  };
});

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock steps API
jest.mock('@services/api/stepsApi', () => ({
  stepsApi: {
    getDailyHistory: jest.fn(() => Promise.resolve([])),
    addStepEntry: jest.fn(() => Promise.resolve({ id: 'test-id' })),
  },
}));

// Mock components
jest.mock('@components/common/ErrorMessage', () => ({
  ErrorMessage: ({ message, onRetry }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID="error-message">
        <RN.Text testID="error-text">{message}</RN.Text>
        <RN.TouchableOpacity testID="retry-button" onPress={onRetry}>
          <RN.Text>Retry</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
}));

// Mock ManualStepEntryModal
jest.mock('@components/steps', () => ({
  ManualStepEntryModal: ({ visible, onDismiss, onSuccess }: any) => {
    const RN = require('react-native');
    if (!visible) return null;
    return (
      <RN.View testID="manual-entry-modal">
        <RN.TouchableOpacity testID="manual-entry-dismiss" onPress={onDismiss}>
          <RN.Text>Cancel</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity testID="manual-entry-save" onPress={onSuccess}>
          <RN.Text>Save</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
}));

// Mock the hooks with stateful useCustomDateRange so date picker tests work
jest.mock('../hooks', () => {
  const ReactMock = require('react');

  return {
    useChartData: jest.fn(() => ({
      chartData: [
        { label: 'Mon', value: 8000 },
        { label: 'Tue', value: 8500 },
        { label: 'Wed', value: 9000 },
        { label: 'Thu', value: 7500 },
        { label: 'Fri', value: 10000 },
        { label: 'Sat', value: 11000 },
        { label: 'Sun', value: 9500 },
      ],
      stats: { total: 63500, average: 9071, distanceMeters: 50000 },
      periodLabel: 'Jan 9 - Jan 15, 2024',
      isLoading: false,
      error: null,
    })),
    useCustomDateRange: jest.fn(() => {
      const [isDatePickerVisible, setIsDatePickerVisible] = ReactMock.useState(false);
      const [customDateRange, setCustomDateRange] = ReactMock.useState(null);

      return {
        isDatePickerVisible,
        customDateRange,
        customChartData: null,
        isCustomLoading: false,
        customError: null,
        defaultDateRangeStart: new Date('2024-01-09'),
        defaultDateRangeEnd: new Date('2024-01-15'),
        openDatePicker: () => setIsDatePickerVisible(true),
        closeDatePicker: () => setIsDatePickerVisible(false),
        confirmDateRange: (start: any, end: any) => {
          setCustomDateRange({ start, end });
          setIsDatePickerVisible(false);
        },
        clearCustomRange: () => {
          setCustomDateRange(null);
        },
        retryCustomFetch: jest.fn(),
      };
    }),
    useChartDisplay: jest.fn((params: any) => ({
      displayChartData: params.regularChartData,
      displayStats: params.regularStats,
      displayPeriodLabel: params.regularPeriodLabel,
      displayIsLoading: params.isRegularLoading,
      displayError: params.regularError,
      canGoNext: !params.customDateRange && params.chartOffset < 0,
      isCustomMode: !!params.customDateRange,
    })),
  };
});

// Mock the step components
jest.mock('../components', () => ({
  ChartNavigation: ({ viewMode, onViewModeChange, onPrevious, onNext, canGoNext, periodLabel, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.View testID="segmented-buttons">
          <RN.TouchableOpacity
            testID="segment-daily"
            onPress={() => onViewModeChange('daily')}
            accessibilityState={{ selected: viewMode === 'daily' }}
          >
            <RN.Text>Daily</RN.Text>
          </RN.TouchableOpacity>
          <RN.TouchableOpacity
            testID="segment-weekly"
            onPress={() => onViewModeChange('weekly')}
            accessibilityState={{ selected: viewMode === 'weekly' }}
          >
            <RN.Text>Weekly</RN.Text>
          </RN.TouchableOpacity>
          <RN.TouchableOpacity
            testID="segment-monthly"
            onPress={() => onViewModeChange('monthly')}
            accessibilityState={{ selected: viewMode === 'monthly' }}
          >
            <RN.Text>Monthly</RN.Text>
          </RN.TouchableOpacity>
        </RN.View>
        <RN.TouchableOpacity testID="nav-previous" onPress={onPrevious}>
          <RN.Text>Prev</RN.Text>
        </RN.TouchableOpacity>
        <RN.Text testID="period-label">{periodLabel}</RN.Text>
        <RN.TouchableOpacity testID="nav-next" onPress={onNext} disabled={!canGoNext}>
          <RN.Text>Next</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
  DateRangePicker: ({ visible, testID, onDismiss, onConfirm }: any) => {
    const RN = require('react-native');
    if (!visible) return null;
    return (
      <RN.View testID={testID}>
        <RN.TouchableOpacity testID={`${testID}-dismiss`} onPress={onDismiss}>
          <RN.Text>Cancel</RN.Text>
        </RN.TouchableOpacity>
        <RN.TouchableOpacity
          testID={`${testID}-confirm`}
          onPress={() => onConfirm(new Date('2024-01-01'), new Date('2024-01-15'))}
        >
          <RN.Text>Apply</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
  StepHistoryItem: ({ entry, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text>{entry.steps} steps</RN.Text>
      </RN.View>
    );
  },
  StatsSummary: ({ stats, periodLabel, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text>Total: {stats?.total}</RN.Text>
        <RN.Text>Average: {stats?.average}</RN.Text>
        <RN.Text>Period: {periodLabel}</RN.Text>
      </RN.View>
    );
  },
  StepsChart: ({ chartData, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID={testID}>
        <RN.Text>{chartData?.length || 0} data points</RN.Text>
      </RN.View>
    );
  },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Appbar = {
    Header: ({ children, elevated }: any) => (
      <RN.View testID="appbar-header">{children}</RN.View>
    ),
    Content: ({ title }: any) => (
      <RN.Text testID="appbar-title">{title}</RN.Text>
    ),
    Action: ({ icon, onPress, accessibilityLabel }: any) => (
      <RN.TouchableOpacity
        testID={`appbar-action-${icon}`}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
  };

  return {
    Appbar,
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    Divider: () => <RN.View testID="divider" />,
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onBackground: '#000000',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

const mockUseStepsStore = useStepsStore as jest.MockedFunction<typeof useStepsStore>;
const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('StepsHistoryScreen', () => {
  const mockLoadMoreHistory = jest.fn().mockResolvedValue(undefined);
  const mockResetPaginatedHistory = jest.fn();

  const createMockEntry = (overrides: Partial<DailyStepEntry> = {}): DailyStepEntry => ({
    date: '2024-01-15',
    steps: 8500,
    distanceMeters: 6800,
    ...overrides,
  });

  const createMockEntries = (count: number): DailyStepEntry[] => {
    return Array.from({ length: count }, (_, index) => ({
      date: `2024-01-${String(15 - index).padStart(2, '0')}`,
      steps: 8000 + index * 500,
      distanceMeters: (8000 + index * 500) * 0.8,
    }));
  };

  const defaultStepsState = {
    paginatedHistory: createMockEntries(7),
    hasMoreHistory: true,
    isPaginatedHistoryLoading: false,
    loadMoreHistory: mockLoadMoreHistory,
    resetPaginatedHistory: mockResetPaginatedHistory,
    fetchDailyHistory: jest.fn(),
  };

  const defaultUserState = {
    currentUser: {
      id: 'user-1',
      email: 'test@example.com',
      display_name: 'Test User',
      username: 'testuser',
      preferences: {
        id: 'user-1',
        units: 'metric' as const,
        daily_step_goal: 10000,
        notifications_enabled: true,
        privacy_find_me: 'public' as const,
        privacy_show_steps: 'partial' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      created_at: '2024-01-01T00:00:00Z',
      onboarding_completed: true,
    },
    themePreference: 'system' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseStepsStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultStepsState);
      }
      return defaultStepsState;
    });

    mockUseUserStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultUserState);
      }
      return defaultUserState;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Steps History');
    });

    it('should render chart navigation with segmented buttons', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('chart-navigation')).toBeTruthy();
      expect(getByTestId('segmented-buttons')).toBeTruthy();
    });

    it('should render daily, weekly, and monthly segments', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('segment-daily')).toBeTruthy();
      expect(getByTestId('segment-weekly')).toBeTruthy();
      expect(getByTestId('segment-monthly')).toBeTruthy();
    });

    it('should render FlatList for history items', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('history-item-2024-01-15')).toBeTruthy();
    });

    it('should render add steps action button', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('appbar-action-plus')).toBeTruthy();
    });

    it('should render calendar action button', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('appbar-action-calendar')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should call loadMoreHistory on mount', () => {
      render(<StepsHistoryScreen />);
      expect(mockLoadMoreHistory).toHaveBeenCalled();
    });

    it('should call resetPaginatedHistory on mount', () => {
      render(<StepsHistoryScreen />);
      expect(mockResetPaginatedHistory).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('should not render history items when empty', () => {
      mockUseStepsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultStepsState,
          paginatedHistory: [],
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<StepsHistoryScreen />);
      expect(queryByTestId('history-item-2024-01-15')).toBeNull();
    });
  });

  describe('view mode switching', () => {
    it('should start with daily view mode selected', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('segment-daily').props.accessibilityState.selected).toBe(true);
    });

    it('should switch to weekly view mode when pressed', async () => {
      const { getByTestId } = render(<StepsHistoryScreen />);

      fireEvent.press(getByTestId('segment-weekly'));

      await waitFor(() => {
        expect(getByTestId('segment-weekly').props.accessibilityState.selected).toBe(true);
      });
    });

    it('should switch to monthly view mode when pressed', async () => {
      const { getByTestId } = render(<StepsHistoryScreen />);

      fireEvent.press(getByTestId('segment-monthly'));

      await waitFor(() => {
        expect(getByTestId('segment-monthly').props.accessibilityState.selected).toBe(true);
      });
    });
  });

  describe('history list', () => {
    it('should render history items', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('history-item-2024-01-15')).toBeTruthy();
    });

    it('should pass correct props to history items', () => {
      const { getByText } = render(<StepsHistoryScreen />);
      expect(getByText('8000 steps')).toBeTruthy();
    });
  });

  describe('user preferences', () => {
    it('should render when user has no preferences (uses defaults)', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = { currentUser: null };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<StepsHistoryScreen />);
      // Screen should still render with default values
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should render with imperial units set in preferences', () => {
      mockUseUserStore.mockImplementation((selector?: any) => {
        const state = {
          currentUser: {
            ...defaultUserState.currentUser,
            preferences: {
              ...defaultUserState.currentUser.preferences,
              units: 'imperial' as const,
            },
          },
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<StepsHistoryScreen />);
      // Screen should render with imperial units
      expect(getByTestId('appbar-header')).toBeTruthy();
    });
  });

  describe('date range picker', () => {
    it('should open date picker when calendar action is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<StepsHistoryScreen />);

      // Date picker should not be visible initially
      expect(queryByTestId('date-range-picker')).toBeNull();

      // Press calendar action
      fireEvent.press(getByTestId('appbar-action-calendar'));

      // Date picker should now be visible
      await waitFor(() => {
        expect(getByTestId('date-range-picker')).toBeTruthy();
      });
    });

    it('should close date picker when dismissed', async () => {
      const { getByTestId, queryByTestId } = render(<StepsHistoryScreen />);

      // Open date picker
      fireEvent.press(getByTestId('appbar-action-calendar'));

      await waitFor(() => {
        expect(getByTestId('date-range-picker')).toBeTruthy();
      });

      // Dismiss date picker
      fireEvent.press(getByTestId('date-range-picker-dismiss'));

      await waitFor(() => {
        expect(queryByTestId('date-range-picker')).toBeNull();
      });
    });
  });

  describe('manual entry modal', () => {
    it('should open manual entry modal when plus action is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<StepsHistoryScreen />);

      // Modal should not be visible initially
      expect(queryByTestId('manual-entry-modal')).toBeNull();

      // Press plus action
      fireEvent.press(getByTestId('appbar-action-plus'));

      // Modal should now be visible
      await waitFor(() => {
        expect(getByTestId('manual-entry-modal')).toBeTruthy();
      });
    });

    it('should close manual entry modal when dismissed', async () => {
      const { getByTestId, queryByTestId } = render(<StepsHistoryScreen />);

      // Open modal
      fireEvent.press(getByTestId('appbar-action-plus'));

      await waitFor(() => {
        expect(getByTestId('manual-entry-modal')).toBeTruthy();
      });

      // Dismiss modal
      fireEvent.press(getByTestId('manual-entry-dismiss'));

      await waitFor(() => {
        expect(queryByTestId('manual-entry-modal')).toBeNull();
      });
    });
  });

  describe('chart integration', () => {
    it('should render all history items from store', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      // Verify that history items are rendered
      expect(getByTestId('history-item-2024-01-15')).toBeTruthy();
      expect(getByTestId('history-item-2024-01-09')).toBeTruthy();
    });

    it('should update list when data changes', () => {
      const entries = createMockEntries(3);
      mockUseStepsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultStepsState,
          paginatedHistory: entries,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId, queryByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('history-item-2024-01-15')).toBeTruthy();
      expect(getByTestId('history-item-2024-01-13')).toBeTruthy();
      // Entry 3 should not exist since we only have 3 entries (0, 1, 2)
      expect(queryByTestId('history-item-2024-01-12')).toBeNull();
    });
  });

  describe('chart navigation', () => {
    it('should render navigation controls', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('nav-previous')).toBeTruthy();
      expect(getByTestId('nav-next')).toBeTruthy();
    });

    it('should display period label', () => {
      const { getByTestId } = render(<StepsHistoryScreen />);
      expect(getByTestId('period-label')).toBeTruthy();
    });
  });
});

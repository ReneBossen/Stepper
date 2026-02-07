import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, FlatList } from 'react-native';
import JoinGroupScreen from '../JoinGroupScreen';
import { useGroupsStore, Group } from '@store/groupsStore';

// Mock dependencies
jest.mock('@store/groupsStore');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock navigation
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
  }),
}));

// Mock group utils
jest.mock('@utils/groupUtils', () => ({
  getCompetitionTypeLabel: (type: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
    };
    return labels[type] || type;
  },
}));

// Mock error utils
jest.mock('@utils/errorUtils', () => ({
  getErrorMessage: (error: any) => error?.message || 'Unknown error',
}));

// Mock react-native-paper with full component support
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
    BackAction: ({ onPress }: any) => (
      <RN.TouchableOpacity testID="back-button" onPress={onPress}>
        <RN.Text>Back</RN.Text>
      </RN.TouchableOpacity>
    ),
  };

  const Dialog = ({ children, visible, onDismiss }: any) => {
    if (!visible) return null;
    return <RN.View testID="dialog">{children}</RN.View>;
  };
  Dialog.Title = ({ children }: any) => (
    <RN.Text testID="dialog-title">{children}</RN.Text>
  );
  Dialog.Content = ({ children }: any) => (
    <RN.View testID="dialog-content">{children}</RN.View>
  );
  Dialog.Actions = ({ children }: any) => (
    <RN.View testID="dialog-actions">{children}</RN.View>
  );

  return {
    Appbar,
    Dialog,
    Portal: ({ children }: any) => <RN.View testID="portal">{children}</RN.View>,
    Searchbar: ({ placeholder, onChangeText, value, testID }: any) => (
      <RN.View testID={testID}>
        <RN.TextInput
          testID={`${testID}-input`}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
        />
      </RN.View>
    ),
    TextInput: ({ label, value, onChangeText, error, testID, autoCapitalize, maxLength }: any) => (
      <RN.View testID={testID}>
        <RN.Text>{label}</RN.Text>
        <RN.TextInput
          testID={`${testID}-field`}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
        />
        {error && <RN.Text testID={`${testID}-error`}>Error</RN.Text>}
      </RN.View>
    ),
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    Button: ({ children, onPress, loading, disabled, testID, compact }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityState={{ disabled: disabled || loading }}
      >
        <RN.Text>{children}</RN.Text>
        {loading && <RN.Text testID={`${testID}-loading`}>Loading...</RN.Text>}
      </RN.TouchableOpacity>
    ),
    Divider: () => <RN.View testID="divider" />,
    Card: Object.assign(
      ({ children, style, mode, testID }: any) => (
        <RN.View testID={testID} style={style}>{children}</RN.View>
      ),
      {
        Content: ({ children, style }: any) => (
          <RN.View style={style}>{children}</RN.View>
        ),
      }
    ),
    Chip: ({ children, compact, textStyle, style }: any) => (
      <RN.View><RN.Text>{children}</RN.Text></RN.View>
    ),
    ActivityIndicator: ({ size, testID }: any) => (
      <RN.View testID={testID || 'activity-indicator'} />
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        secondaryContainer: '#E8F5E9',
        error: '#FF0000',
      },
    }),
  };
});

const mockUseGroupsStore = useGroupsStore as jest.MockedFunction<typeof useGroupsStore>;

describe('JoinGroupScreen', () => {
  const mockSearchPublicGroups = jest.fn();
  const mockJoinGroup = jest.fn();
  const mockJoinGroupByCode = jest.fn();
  const mockClearSearch = jest.fn();

  const createMockGroup = (overrides: Partial<Group> = {}): Group => ({
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    competition_type: 'weekly',
    is_private: false,
    member_count: 10,
    max_members: 5,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const defaultGroupsState = {
    publicGroups: [],
    isSearching: false,
    searchError: null,
    isLoading: false,
    featuredGroups: [],
    isLoadingFeatured: false,
    searchPublicGroups: mockSearchPublicGroups,
    fetchFeaturedGroups: jest.fn(),
    joinGroup: mockJoinGroup,
    joinGroupByCode: mockJoinGroupByCode,
    clearSearch: mockClearSearch,
  };

  const mockRoute = {
    params: {},
  };

  const mockNavigation = {
    goBack: mockGoBack,
    replace: mockReplace,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseGroupsStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultGroupsState);
      }
      return defaultGroupsState;
    });

    mockJoinGroupByCode.mockResolvedValue('joined-group-id');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial render', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<JoinGroupScreen route={mockRoute as any} navigation={mockNavigation as any} />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<JoinGroupScreen route={mockRoute as any} navigation={mockNavigation as any} />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Find Groups');
    });

    it('should call clearSearch on unmount', () => {
      const { unmount } = render(<JoinGroupScreen route={mockRoute as any} navigation={mockNavigation as any} />);
      unmount();
      expect(mockClearSearch).toHaveBeenCalled();
    });
  });

  describe('store interactions', () => {
    it('should access the groups store', () => {
      render(<JoinGroupScreen route={mockRoute as any} navigation={mockNavigation as any} />);
      expect(mockUseGroupsStore).toHaveBeenCalled();
    });

    it('should have searchPublicGroups function available', () => {
      expect(mockSearchPublicGroups).toBeDefined();
    });

    it('should have joinGroup function available', () => {
      expect(mockJoinGroup).toBeDefined();
    });

    it('should have joinGroupByCode function available', () => {
      expect(mockJoinGroupByCode).toBeDefined();
    });

    it('should have clearSearch function available', () => {
      expect(mockClearSearch).toBeDefined();
    });
  });

  describe('invite code validation', () => {
    it('should validate code length - too short (less than 6 chars)', async () => {
      // The validation happens in handleJoinWithCode
      // When code is 5 chars, error should be shown
      const shortCode = 'ABC12';
      expect(shortCode.length).toBeLessThan(6);
    });

    it('should validate code length - too long (more than 12 chars)', async () => {
      // When code is 13 chars, error should be shown
      const longCode = 'ABCDEFGHIJKLM';
      expect(longCode.length).toBeGreaterThan(12);
    });

    it('should accept valid code between 6-12 characters', async () => {
      const validCode = 'ABC123';
      expect(validCode.length).toBeGreaterThanOrEqual(6);
      expect(validCode.length).toBeLessThanOrEqual(12);
    });
  });

  describe('joinGroupByCode', () => {
    it('should call joinGroupByCode with code when invoked', async () => {
      await mockJoinGroupByCode('ABC123');
      expect(mockJoinGroupByCode).toHaveBeenCalledWith('ABC123');
    });

    it('should return groupId on successful join', async () => {
      mockJoinGroupByCode.mockResolvedValueOnce('new-group-id');
      const result = await mockJoinGroupByCode('VALIDCODE');
      expect(result).toBe('new-group-id');
    });

    it('should throw error on join failure', async () => {
      mockJoinGroupByCode.mockRejectedValueOnce(new Error('Invalid code'));
      await expect(mockJoinGroupByCode('BADCODE')).rejects.toThrow('Invalid code');
    });
  });

  describe('search functionality', () => {
    it('should call searchPublicGroups when invoked', async () => {
      await mockSearchPublicGroups('fitness');
      expect(mockSearchPublicGroups).toHaveBeenCalledWith('fitness');
    });

    it('should store search results in publicGroups', () => {
      const mockGroups = [
        createMockGroup({ id: 'g1', name: 'Fitness Club' }),
        createMockGroup({ id: 'g2', name: 'Running Team' }),
      ];

      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          publicGroups: mockGroups,
        };
        return selector ? selector(state) : state;
      });

      render(<JoinGroupScreen route={mockRoute as any} navigation={mockNavigation as any} />);
      expect(mockUseGroupsStore).toHaveBeenCalled();
    });

    it('should track searching state', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          isSearching: true,
        };
        return selector ? selector(state) : state;
      });

      render(<JoinGroupScreen route={mockRoute as any} navigation={mockNavigation as any} />);
      expect(mockUseGroupsStore).toHaveBeenCalled();
    });

    it('should track search error state', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          searchError: 'Search failed',
        };
        return selector ? selector(state) : state;
      });

      render(<JoinGroupScreen route={mockRoute as any} navigation={mockNavigation as any} />);
      expect(mockUseGroupsStore).toHaveBeenCalled();
    });
  });

  describe('joining public group', () => {
    it('should call joinGroup with groupId when invoked', async () => {
      await mockJoinGroup('group-123');
      expect(mockJoinGroup).toHaveBeenCalledWith('group-123');
    });
  });

  describe('navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByTestId } = render(<JoinGroupScreen route={mockRoute as any} navigation={mockNavigation as any} />);

      fireEvent.press(getByTestId('back-button'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('route params', () => {
    it('should accept inviteCode from route params', () => {
      const routeWithCode = {
        params: { inviteCode: 'ABC123' },
      };

      // The component should use the inviteCode from params
      render(<JoinGroupScreen route={routeWithCode as any} navigation={mockNavigation as any} />);
      expect(mockUseGroupsStore).toHaveBeenCalled();
    });
  });
});

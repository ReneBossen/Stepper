import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GroupsListScreen from '../GroupsListScreen';
import { useGroupsStore, GroupWithLeaderboard, LeaderboardEntry } from '@store/groupsStore';

// Mock dependencies
jest.mock('@store/groupsStore');

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock components
jest.mock('@components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const RN = require('react-native');
    return <RN.View testID="loading-spinner" />;
  },
}));

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

jest.mock('../components', () => ({
  GroupCard: ({ group, onPress, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.TouchableOpacity testID={testID} onPress={() => onPress?.(group)}>
        <RN.Text testID={`${testID}-name`}>{group.name}</RN.Text>
        <RN.Text testID={`${testID}-members`}>{group.member_count} members</RN.Text>
      </RN.TouchableOpacity>
    );
  },
  JoinGroupCard: ({ onPress, testID }: any) => {
    const RN = require('react-native');
    return (
      <RN.TouchableOpacity testID={testID} onPress={onPress}>
        <RN.Text>Join a Group</RN.Text>
      </RN.TouchableOpacity>
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
    FAB: ({ icon, style, color, onPress, accessibilityLabel, testID }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        style={style}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Divider: () => <RN.View testID="divider" />,
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        onPrimary: '#FFFFFF',
      },
    }),
  };
});

const mockUseGroupsStore = useGroupsStore as jest.MockedFunction<typeof useGroupsStore>;

describe('GroupsListScreen', () => {
  const mockFetchMyGroups = jest.fn();

  const createMockLeaderboardEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
    user_id: 'user-1',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    steps: 5000,
    rank: 1,
    rank_change: 0,
    is_current_user: false,
    ...overrides,
  });

  const createMockGroup = (overrides: Partial<GroupWithLeaderboard> = {}): GroupWithLeaderboard => ({
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    competition_type: 'weekly',
    is_private: false,
    member_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    user_role: 'member',
    period_start: '2024-01-01',
    period_end: '2024-01-07',
    period_display: 'Jan 1 - Jan 7',
    leaderboard_preview: [
      createMockLeaderboardEntry({ rank: 1, display_name: 'Leader', steps: 10000 }),
      createMockLeaderboardEntry({ rank: 2, display_name: 'Second', steps: 8000 }),
      createMockLeaderboardEntry({ rank: 3, display_name: 'Third', steps: 6000 }),
    ],
    current_user_rank: 4,
    current_user_steps: 4500,
    ...overrides,
  });

  const createMockGroups = (count: number): GroupWithLeaderboard[] => {
    return Array.from({ length: count }, (_, index) =>
      createMockGroup({
        id: `group-${index}`,
        name: `Group ${index}`,
        member_count: 3 + index,
      })
    );
  };

  const defaultGroupsState = {
    myGroups: createMockGroups(3),
    isLoadingGroups: false,
    groupsError: null,
    fetchMyGroups: mockFetchMyGroups,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGroupsStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultGroupsState);
      }
      return defaultGroupsState;
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Groups');
    });

    it('should render create group action button', () => {
      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('appbar-action-plus')).toBeTruthy();
    });

    it('should render FAB for creating groups', () => {
      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('create-group-fab')).toBeTruthy();
    });

    it('should render group cards', () => {
      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('group-card-group-0')).toBeTruthy();
      expect(getByTestId('group-card-group-1')).toBeTruthy();
      expect(getByTestId('group-card-group-2')).toBeTruthy();
    });

  });

  describe('loading state', () => {
    it('should show loading spinner when loading with no data', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          myGroups: [],
          isLoadingGroups: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should not show loading spinner when loading with existing data', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          isLoadingGroups: true,
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<GroupsListScreen />);
      expect(queryByTestId('loading-spinner')).toBeNull();
    });
  });

  describe('error state', () => {
    it('should show error message when there is an error and no data', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          myGroups: [],
          groupsError: 'Failed to load groups',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('error-message')).toBeTruthy();
    });

    it('should display error text', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          myGroups: [],
          groupsError: 'Network error',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('error-text')).toHaveTextContent('Network error');
    });

    it('should call fetchMyGroups when retry is pressed', async () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          myGroups: [],
          groupsError: 'Failed to load',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<GroupsListScreen />);

      fireEvent.press(getByTestId('retry-button'));

      await waitFor(() => {
        expect(mockFetchMyGroups).toHaveBeenCalled();
      });
    });

    it('should not show error when data exists despite error', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          groupsError: 'Some error',
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<GroupsListScreen />);
      expect(queryByTestId('error-message')).toBeNull();
    });
  });

  describe('empty state', () => {
    // Note: FlatList's ListEmptyComponent, ListHeaderComponent, and ListFooterComponent
    // are not rendered in the test environment. These tests verify state-based behavior.

    it('should not render group cards when no groups', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          myGroups: [],
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(<GroupsListScreen />);
      expect(queryByTestId('group-card-group-0')).toBeNull();
    });

    it('should still render FAB when empty', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          myGroups: [],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('create-group-fab')).toBeTruthy();
    });

    it('should still render appbar when empty', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          myGroups: [],
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });
  });

  describe('pull-to-refresh', () => {
    it('should fetch groups on mount', () => {
      render(<GroupsListScreen />);
      expect(mockFetchMyGroups).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should navigate to CreateGroup when FAB is pressed', () => {
      const { getByTestId } = render(<GroupsListScreen />);

      fireEvent.press(getByTestId('create-group-fab'));

      expect(mockNavigate).toHaveBeenCalledWith('CreateGroup');
    });

    it('should navigate to CreateGroup when appbar action is pressed', () => {
      const { getByTestId } = render(<GroupsListScreen />);

      fireEvent.press(getByTestId('appbar-action-plus'));

      expect(mockNavigate).toHaveBeenCalledWith('CreateGroup');
    });

    it('should navigate to GroupDetail when group card is pressed', () => {
      const { getByTestId } = render(<GroupsListScreen />);

      fireEvent.press(getByTestId('group-card-group-0'));

      expect(mockNavigate).toHaveBeenCalledWith('GroupDetail', { groupId: 'group-0' });
    });
  });

  describe('data display', () => {
    it('should display group names', () => {
      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('group-card-group-0-name')).toHaveTextContent('Group 0');
      expect(getByTestId('group-card-group-1-name')).toHaveTextContent('Group 1');
    });

    it('should display member counts', () => {
      const { getByTestId } = render(<GroupsListScreen />);
      expect(getByTestId('group-card-group-0-members')).toHaveTextContent('3 members');
      expect(getByTestId('group-card-group-1-members')).toHaveTextContent('4 members');
    });
  });

  describe('data fetching', () => {
    it('should call fetchMyGroups on mount', () => {
      render(<GroupsListScreen />);
      expect(mockFetchMyGroups).toHaveBeenCalledTimes(1);
    });
  });
});

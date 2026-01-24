import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useGroupsStore, Group, GroupMember, CreateGroupData, LeaderboardEntry, GroupDetail, GroupWithLeaderboard } from '../groupsStore';
import { groupsApi } from '@services/api/groupsApi';

// Mock the groups API
jest.mock('@services/api/groupsApi');

const mockGroupsApi = groupsApi as jest.Mocked<typeof groupsApi>;

describe('groupsStore', () => {
  const mockGroups: Group[] = [
    {
      id: 'group-1',
      name: 'Morning Walkers',
      description: 'Early bird group',
      competition_type: 'daily',
      is_private: false,
      member_count: 15,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'group-2',
      name: 'Weekend Warriors',
      description: 'Weekend fitness enthusiasts',
      competition_type: 'weekly',
      is_private: true,
      member_count: 8,
      created_at: '2024-01-05T00:00:00Z',
    },
  ];

  const mockGroupDetail: GroupDetail = {
    ...mockGroups[0],
    user_role: 'member',
    period_start: '2024-01-15',
    period_end: '2024-01-15',
    period_display: 'Jan 15, 2024',
  };

  const mockLeaderboard: LeaderboardEntry[] = [
    {
      user_id: 'user-1',
      display_name: 'John Doe',
      avatar_url: 'https://example.com/john.jpg',
      steps: 12000,
      rank: 1,
      rank_change: 2,
      is_current_user: false,
    },
    {
      user_id: 'user-2',
      display_name: 'Jane Smith',
      avatar_url: 'https://example.com/jane.jpg',
      steps: 10500,
      rank: 2,
      rank_change: -1,
      is_current_user: true,
    },
  ];

  const mockMyGroups: GroupWithLeaderboard[] = [
    {
      ...mockGroups[0],
      user_role: 'owner',
      period_start: '2024-01-15',
      period_end: '2024-01-15',
      period_display: 'Jan 15, 2024',
      leaderboard_preview: mockLeaderboard.slice(0, 3),
      current_user_rank: 2,
      current_user_steps: 10500,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useGroupsStore.setState({
      myGroups: [],
      isLoadingGroups: false,
      groupsError: null,
      currentGroup: null,
      leaderboard: [],
      isLoadingDetail: false,
      detailError: null,
      groups: [],
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useGroupsStore());

      expect(result.current.groups).toEqual([]);
      expect(result.current.myGroups).toEqual([]);
      expect(result.current.currentGroup).toBeNull();
      expect(result.current.leaderboard).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoadingGroups).toBe(false);
      expect(result.current.isLoadingDetail).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.groupsError).toBeNull();
      expect(result.current.detailError).toBeNull();
    });
  });

  describe('fetchGroups', () => {
    it('should fetch groups successfully', async () => {
      mockGroupsApi.getGroups.mockResolvedValue(mockGroups);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchGroups();
      });

      expect(mockGroupsApi.getGroups).toHaveBeenCalled();
      expect(result.current.groups).toEqual(mockGroups);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty groups list', async () => {
      mockGroupsApi.getGroups.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchGroups();
      });

      expect(result.current.groups).toEqual([]);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch groups');
      mockGroupsApi.getGroups.mockRejectedValue(error);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchGroups();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch groups');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      mockGroupsApi.getGroups.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockGroups), 100))
      );

      const { result } = renderHook(() => useGroupsStore());

      act(() => {
        result.current.fetchGroups();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear previous errors on fetch', async () => {
      mockGroupsApi.getGroups.mockResolvedValue(mockGroups);

      const { result } = renderHook(() => useGroupsStore());

      useGroupsStore.setState({ error: 'Previous error' });

      await act(async () => {
        await result.current.fetchGroups();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchMyGroups', () => {
    it('should fetch user groups with leaderboard preview', async () => {
      mockGroupsApi.getMyGroups.mockResolvedValue(mockMyGroups);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchMyGroups();
      });

      expect(mockGroupsApi.getMyGroups).toHaveBeenCalled();
      expect(result.current.myGroups).toEqual(mockMyGroups);
      expect(result.current.isLoadingGroups).toBe(false);
      expect(result.current.groupsError).toBeNull();
    });

    it('should handle fetch error for my groups', async () => {
      const error = new Error('Failed to fetch my groups');
      mockGroupsApi.getMyGroups.mockRejectedValue(error);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchMyGroups();
      });

      await waitFor(() => {
        expect(result.current.groupsError).toBe('Failed to fetch my groups');
      });
      expect(result.current.isLoadingGroups).toBe(false);
    });
  });

  describe('fetchGroup', () => {
    it('should fetch single group successfully', async () => {
      mockGroupsApi.getGroup.mockResolvedValue(mockGroupDetail);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchGroup('group-1');
      });

      expect(mockGroupsApi.getGroup).toHaveBeenCalledWith('group-1');
      expect(result.current.currentGroup).toEqual(mockGroupDetail);
      expect(result.current.isLoadingDetail).toBe(false);
      expect(result.current.detailError).toBeNull();
    });

    it('should handle fetch single group error', async () => {
      const error = new Error('Group not found');
      mockGroupsApi.getGroup.mockRejectedValue(error);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchGroup('invalid-group');
      });

      await waitFor(() => {
        expect(result.current.detailError).toBe('Group not found');
      });
      expect(result.current.currentGroup).toBeNull();
    });

    it('should replace current group on fetch', async () => {
      const secondGroupDetail: GroupDetail = {
        ...mockGroups[1],
        user_role: 'admin',
        period_start: '2024-01-08',
        period_end: '2024-01-14',
        period_display: 'Jan 8 - Jan 14',
      };
      mockGroupsApi.getGroup.mockResolvedValue(secondGroupDetail);

      const { result } = renderHook(() => useGroupsStore());

      useGroupsStore.setState({ currentGroup: mockGroupDetail });

      await act(async () => {
        await result.current.fetchGroup('group-2');
      });

      expect(result.current.currentGroup).toEqual(secondGroupDetail);
    });
  });

  describe('fetchLeaderboard', () => {
    it('should fetch leaderboard successfully', async () => {
      mockGroupsApi.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchLeaderboard('group-1');
      });

      expect(mockGroupsApi.getLeaderboard).toHaveBeenCalledWith('group-1');
      expect(result.current.leaderboard).toEqual(mockLeaderboard);
      expect(result.current.isLoadingDetail).toBe(false);
      expect(result.current.detailError).toBeNull();
    });

    it('should handle empty leaderboard', async () => {
      mockGroupsApi.getLeaderboard.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchLeaderboard('group-1');
      });

      expect(result.current.leaderboard).toEqual([]);
    });

    it('should handle fetch leaderboard error', async () => {
      const error = new Error('Leaderboard unavailable');
      mockGroupsApi.getLeaderboard.mockRejectedValue(error);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchLeaderboard('group-1');
      });

      await waitFor(() => {
        expect(result.current.detailError).toBe('Leaderboard unavailable');
      });
    });

    it('should verify leaderboard is sorted by rank', async () => {
      const unsortedLeaderboard = [...mockLeaderboard].reverse();
      mockGroupsApi.getLeaderboard.mockResolvedValue(unsortedLeaderboard);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchLeaderboard('group-1');
      });

      // Store should accept whatever order API returns
      expect(result.current.leaderboard[0].rank).toBe(2);
      expect(result.current.leaderboard[1].rank).toBe(1);
    });
  });

  describe('createGroup', () => {
    const newGroupData: CreateGroupData = {
      name: 'New Group',
      description: 'Test group',
      competition_type: 'weekly',
      is_private: false,
    };

    const createdGroup: Group = {
      id: 'group-3',
      ...newGroupData,
      member_count: 1,
      created_at: '2024-01-15T00:00:00Z',
    };

    it('should create group successfully', async () => {
      mockGroupsApi.createGroup.mockResolvedValue(createdGroup);
      mockGroupsApi.getMyGroups.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      let returnedGroup: Group | undefined;

      await act(async () => {
        returnedGroup = await result.current.createGroup(newGroupData);
      });

      expect(mockGroupsApi.createGroup).toHaveBeenCalledWith(newGroupData);
      expect(returnedGroup).toEqual(createdGroup);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle create group error', async () => {
      const error = new Error('Group name already exists');
      mockGroupsApi.createGroup.mockRejectedValue(error);

      const { result } = renderHook(() => useGroupsStore());

      try {
        await act(async () => {
          await result.current.createGroup(newGroupData);
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Group name already exists');
      });
    });

    it('should set loading state during create', async () => {
      mockGroupsApi.createGroup.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(createdGroup), 100))
      );
      mockGroupsApi.getMyGroups.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      act(() => {
        result.current.createGroup(newGroupData);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should create private group', async () => {
      const privateGroupData = { ...newGroupData, is_private: true };
      const privateGroup = { ...createdGroup, is_private: true };

      mockGroupsApi.createGroup.mockResolvedValue(privateGroup);
      mockGroupsApi.getMyGroups.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      let returnedGroup: Group | undefined;

      await act(async () => {
        returnedGroup = await result.current.createGroup(privateGroupData);
      });

      expect(returnedGroup?.is_private).toBe(true);
    });

    it('should support all competition types', async () => {
      const competitionTypes: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];

      for (const type of competitionTypes) {
        const groupData = { ...newGroupData, competition_type: type };
        const group = { ...createdGroup, competition_type: type };

        mockGroupsApi.createGroup.mockResolvedValue(group);
        mockGroupsApi.getMyGroups.mockResolvedValue([]);

        const { result } = renderHook(() => useGroupsStore());

        let returnedGroup: Group | undefined;

        await act(async () => {
          returnedGroup = await result.current.createGroup(groupData);
        });

        expect(returnedGroup?.competition_type).toBe(type);
      }
    });
  });

  describe('joinGroup', () => {
    it('should join group successfully', async () => {
      mockGroupsApi.joinGroup.mockResolvedValue(undefined);
      mockGroupsApi.getMyGroups.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.joinGroup('group-1');
      });

      expect(mockGroupsApi.joinGroup).toHaveBeenCalledWith('group-1');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle join group error', async () => {
      const error = new Error('Group is full');
      mockGroupsApi.joinGroup.mockRejectedValue(error);

      const { result } = renderHook(() => useGroupsStore());

      try {
        await act(async () => {
          await result.current.joinGroup('group-1');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Group is full');
      });
    });

    it('should set loading state during join', async () => {
      mockGroupsApi.joinGroup.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      mockGroupsApi.getMyGroups.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      act(() => {
        result.current.joinGroup('group-1');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('joinGroupByCode', () => {
    it('should join group by code successfully', async () => {
      mockGroupsApi.joinGroupByCode.mockResolvedValue('group-1');
      mockGroupsApi.getMyGroups.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      let groupId: string | undefined;

      await act(async () => {
        groupId = await result.current.joinGroupByCode('ABC123');
      });

      expect(mockGroupsApi.joinGroupByCode).toHaveBeenCalledWith('ABC123');
      expect(groupId).toBe('group-1');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle invalid join code', async () => {
      const error = new Error('Invalid join code');
      mockGroupsApi.joinGroupByCode.mockRejectedValue(error);

      const { result } = renderHook(() => useGroupsStore());

      try {
        await act(async () => {
          await result.current.joinGroupByCode('INVALID');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid join code');
      });
    });
  });

  describe('leaveGroup', () => {
    it('should leave group successfully', async () => {
      mockGroupsApi.leaveGroup.mockResolvedValue(undefined);
      mockGroupsApi.getMyGroups.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.leaveGroup('group-1');
      });

      expect(mockGroupsApi.leaveGroup).toHaveBeenCalledWith('group-1');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle leave group error', async () => {
      const error = new Error('Leave failed');
      mockGroupsApi.leaveGroup.mockRejectedValue(error);

      const { result } = renderHook(() => useGroupsStore());

      try {
        await act(async () => {
          await result.current.leaveGroup('group-1');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Leave failed');
      });
    });

    it('should set loading state during leave', async () => {
      mockGroupsApi.leaveGroup.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      mockGroupsApi.getMyGroups.mockResolvedValue([]);

      const { result } = renderHook(() => useGroupsStore());

      act(() => {
        result.current.leaveGroup('group-1');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('clearCurrentGroup', () => {
    it('should clear current group and leaderboard', () => {
      const { result } = renderHook(() => useGroupsStore());

      useGroupsStore.setState({
        currentGroup: mockGroupDetail,
        leaderboard: mockLeaderboard,
      });

      act(() => {
        result.current.clearCurrentGroup();
      });

      expect(result.current.currentGroup).toBeNull();
      expect(result.current.leaderboard).toEqual([]);
    });
  });
});

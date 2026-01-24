import { groupsApi } from '../groupsApi';
import { supabase } from '@services/supabase';
import { Group, GroupMember, CreateGroupData } from '@store/groupsStore';

// Mock user ID for tests
const MOCK_USER_ID = 'current-user-id';

// Mock the supabase client
jest.mock('@services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockGetUser = supabase.auth.getUser as jest.Mock;

describe('groupsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user is authenticated
    mockGetUser.mockResolvedValue({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
  });

  describe('getGroups', () => {
    it('should fetch groups successfully', async () => {
      const mockData = [
        {
          id: 'group-1',
          name: 'Morning Walkers',
          description: 'Early bird group',
          competition_type: 'daily',
          is_private: false,
          created_at: '2024-01-01T00:00:00Z',
          group_memberships: [{ count: 15 }],
        },
        {
          id: 'group-2',
          name: 'Weekend Warriors',
          description: null,
          competition_type: 'weekly',
          is_private: true,
          created_at: '2024-01-05T00:00:00Z',
          group_memberships: [{ count: 8 }],
        },
      ];

      const mockSelect = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await groupsApi.getGroups();

      expect(mockSupabase.from).toHaveBeenCalledWith('groups');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('group_memberships(count)'));
      expect(result).toHaveLength(2);
      expect(result[0].member_count).toBe(15);
      expect(result[1].member_count).toBe(8);
    });

    it('should handle empty groups list', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await groupsApi.getGroups();

      expect(result).toEqual([]);
    });

    it('should handle groups with zero members', async () => {
      const mockData = [
        {
          id: 'group-1',
          name: 'Empty Group',
          description: 'No members',
          competition_type: 'daily',
          is_private: false,
          created_at: '2024-01-01T00:00:00Z',
          group_memberships: [],
        },
      ];

      const mockSelect = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await groupsApi.getGroups();

      expect(result[0].member_count).toBe(0);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Fetch failed' };

      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(groupsApi.getGroups()).rejects.toEqual(mockError);
    });
  });

  describe('getGroup', () => {
    it('should fetch single group successfully', async () => {
      const mockGroupData = {
        id: 'group-1',
        name: 'Morning Walkers',
        description: 'Early bird group',
        period_type: 'daily',
        is_public: true,
        created_at: '2024-01-01T00:00:00Z',
        group_memberships: [{ count: 15 }],
      };

      const mockMembershipData = {
        role: 'member',
      };

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // Groups query
          const mockSelect = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockGroupData, error: null }),
            }),
          });
          return { select: mockSelect };
        } else {
          // Membership query
          const mockSelect = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockMembershipData, error: null }),
              }),
            }),
          });
          return { select: mockSelect };
        }
      });

      const result = await groupsApi.getGroup('group-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('groups');
      expect(result.id).toBe('group-1');
      expect(result.member_count).toBe(15);
      expect(result.user_role).toBe('member');
    });

    it('should throw error when group not found', async () => {
      const mockError = { message: 'Group not found' };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      });

      await expect(groupsApi.getGroup('invalid-group')).rejects.toEqual(mockError);
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(groupsApi.getGroup('group-1')).rejects.toThrow('User not authenticated');
    });
  });

  describe('getLeaderboard', () => {
    const mockRpc = supabase.rpc as jest.Mock;

    it('should fetch and sort leaderboard successfully', async () => {
      // Mock RPC response with leaderboard data already ranked
      const mockLeaderboardData = [
        {
          user_id: 'user-1',
          display_name: 'John Doe',
          avatar_url: 'https://example.com/john.jpg',
          total_steps: 12000,
          rank: 1,
        },
        {
          user_id: 'user-2',
          display_name: 'Jane Smith',
          avatar_url: null,
          total_steps: 10500,
          rank: 2,
        },
      ];

      // Mock group period_type query
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { period_type: 'weekly' }, error: null }),
          }),
        }),
      });

      // Mock RPC calls - first for current leaderboard, second for previous (rank changes)
      mockRpc
        .mockResolvedValueOnce({ data: mockLeaderboardData, error: null })
        .mockResolvedValueOnce({ data: mockLeaderboardData, error: null });

      const result = await groupsApi.getLeaderboard('group-1');

      expect(result).toHaveLength(2);
      expect(result[0].steps).toBe(12000);
      expect(result[0].rank).toBe(1);
      expect(result[1].steps).toBe(10500);
      expect(result[1].rank).toBe(2);
    });

    it('should handle members with no steps', async () => {
      // Mock RPC response with zero steps
      const mockLeaderboardData = [
        {
          user_id: 'user-1',
          display_name: 'John Doe',
          avatar_url: null,
          total_steps: 0,
          rank: 1,
        },
      ];

      // Mock group period_type query
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { period_type: 'weekly' }, error: null }),
          }),
        }),
      });

      mockRpc
        .mockResolvedValueOnce({ data: mockLeaderboardData, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await groupsApi.getLeaderboard('group-1');

      expect(result[0].steps).toBe(0);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Leaderboard unavailable' };

      // Mock group period_type query
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { period_type: 'weekly' }, error: null }),
          }),
        }),
      });

      mockRpc.mockResolvedValue({ data: null, error: mockError });

      await expect(groupsApi.getLeaderboard('group-1')).rejects.toEqual(mockError);
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(groupsApi.getLeaderboard('group-1')).rejects.toThrow('User not authenticated');
    });
  });

  describe('createGroup', () => {
    const newGroupData: CreateGroupData = {
      name: 'New Group',
      description: 'Test group',
      competition_type: 'weekly',
      is_private: false,
    };

    it('should create group and add creator as member', async () => {
      const createdGroup = {
        id: 'group-3',
        ...newGroupData,
        created_at: '2024-01-15T00:00:00Z',
      };

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: createdGroup,
        error: null,
      });

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // Creating group
          return {
            insert: mockInsert,
            select: mockSelect,
            single: mockSingle,
          };
        } else {
          // Adding membership
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await groupsApi.createGroup(newGroupData);

      expect(result.id).toBe('group-3');
      expect(result.member_count).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('groups');
      expect(mockSupabase.from).toHaveBeenCalledWith('group_memberships');
    });

    it('should throw error when create fails', async () => {
      const mockError = { message: 'Group name already exists' };

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await expect(groupsApi.createGroup(newGroupData)).rejects.toEqual(mockError);
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(groupsApi.createGroup(newGroupData)).rejects.toThrow('User not authenticated');
    });
  });

  describe('joinGroup', () => {
    it('should join group successfully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await groupsApi.joinGroup('group-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('group_memberships');
      expect(mockInsert).toHaveBeenCalledWith({
        group_id: 'group-1',
        role: 'member',
      });
    });

    it('should throw error when join fails', async () => {
      const mockError = { message: 'Already a member' };

      const mockInsert = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await expect(groupsApi.joinGroup('group-1')).rejects.toEqual(mockError);
    });
  });

  describe('leaveGroup', () => {
    it('should leave group successfully', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      await groupsApi.leaveGroup('group-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('group_memberships');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('group_id', 'group-1');
    });

    it('should throw error when leave fails', async () => {
      const mockError = { message: 'Not a member' };

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      await expect(groupsApi.leaveGroup('group-1')).rejects.toEqual(mockError);
    });
  });
});

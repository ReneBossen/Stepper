import { groupsApi } from '../groupsApi';
import { supabase } from '@services/supabase';
import { Group, GroupMember, CreateGroupData } from '@store/groupsStore';

// Mock the supabase client
jest.mock('@services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('groupsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      const mockData = {
        id: 'group-1',
        name: 'Morning Walkers',
        description: 'Early bird group',
        competition_type: 'daily',
        is_private: false,
        created_at: '2024-01-01T00:00:00Z',
        group_memberships: [{ count: 15 }],
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await groupsApi.getGroup('group-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('groups');
      expect(mockEq).toHaveBeenCalledWith('id', 'group-1');
      expect(result.id).toBe('group-1');
      expect(result.member_count).toBe(15);
    });

    it('should throw error when group not found', async () => {
      const mockError = { message: 'Group not found' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      await expect(groupsApi.getGroup('invalid-group')).rejects.toEqual(mockError);
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch and sort leaderboard successfully', async () => {
      const mockMemberships = [
        {
          user_id: 'user-1',
          users: {
            display_name: 'John Doe',
            username: 'johndoe',
            avatar_url: 'https://example.com/john.jpg',
          },
        },
        {
          user_id: 'user-2',
          users: {
            display_name: 'Jane Smith',
            username: 'janesmith',
            avatar_url: null,
          },
        },
      ];

      const mockStepData1 = { steps: 12000 };
      const mockStepData2 = { steps: 10500 };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockMemberships,
        error: null,
      });

      let stepQueryCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'group_memberships') {
          return {
            select: mockSelect,
            eq: mockEq,
          };
        } else if (table === 'step_entries') {
          stepQueryCount++;
          const stepData = stepQueryCount === 1 ? mockStepData1 : mockStepData2;
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: stepData, error: null }),
          };
        }
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await groupsApi.getLeaderboard('group-1');

      expect(result).toHaveLength(2);
      expect(result[0].steps).toBe(12000);
      expect(result[0].rank).toBe(1);
      expect(result[1].steps).toBe(10500);
      expect(result[1].rank).toBe(2);
    });

    it('should handle members with no steps', async () => {
      const mockMemberships = [
        {
          user_id: 'user-1',
          users: {
            display_name: 'John Doe',
            username: 'johndoe',
            avatar_url: null,
          },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockMemberships,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'group_memberships') {
          return {
            select: mockSelect,
            eq: mockEq,
          };
        } else if (table === 'step_entries') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await groupsApi.getLeaderboard('group-1');

      expect(result[0].steps).toBe(0);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Leaderboard unavailable' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      await expect(groupsApi.getLeaderboard('group-1')).rejects.toEqual(mockError);
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

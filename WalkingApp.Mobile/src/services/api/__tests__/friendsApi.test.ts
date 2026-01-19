import { friendsApi } from '../friendsApi';
import { supabase } from '@services/supabase';
import { Friend } from '@store/friendsStore';

// Mock the supabase client
jest.mock('@services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('friendsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFriends', () => {
    it('should fetch friends successfully', async () => {
      const mockData = [
        {
          id: 'friendship-1',
          friend_id: 'user-1',
          status: 'accepted',
          users: {
            id: 'user-1',
            display_name: 'John Doe',
            username: 'johndoe',
            avatar_url: 'https://example.com/john.jpg',
          },
        },
        {
          id: 'friendship-2',
          friend_id: 'user-2',
          status: 'accepted',
          users: {
            id: 'user-2',
            display_name: 'Jane Smith',
            username: 'janesmith',
            avatar_url: null,
          },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await friendsApi.getFriends();

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('users!friendships_friend_id_fkey'));
      expect(mockEq).toHaveBeenCalledWith('status', 'accepted');
      expect(result).toHaveLength(2);
      expect(result[0].display_name).toBe('John Doe');
      expect(result[0].user_id).toBe('user-1');
    });

    it('should handle empty friends list', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await friendsApi.getFriends();

      expect(result).toEqual([]);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Fetch failed' };

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

      await expect(friendsApi.getFriends()).rejects.toEqual(mockError);
    });

    it('should map database fields to Friend type', async () => {
      const mockData = [
        {
          id: 'friendship-1',
          friend_id: 'user-1',
          status: 'accepted',
          users: {
            id: 'user-1',
            display_name: 'Test User',
            username: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await friendsApi.getFriends();

      expect(result[0]).toEqual({
        id: 'friendship-1',
        user_id: 'user-1',
        display_name: 'Test User',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'accepted',
      });
    });
  });

  describe('getFriendsWithSteps', () => {
    it('should fetch friends with today steps successfully', async () => {
      const mockFriendships = [
        {
          id: 'friendship-1',
          friend_id: 'user-1',
          status: 'accepted',
          users: {
            id: 'user-1',
            display_name: 'John Doe',
            username: 'johndoe',
            avatar_url: 'https://example.com/john.jpg',
          },
        },
        {
          id: 'friendship-2',
          friend_id: 'user-2',
          status: 'accepted',
          users: {
            id: 'user-2',
            display_name: 'Jane Smith',
            username: 'janesmith',
            avatar_url: null,
          },
        },
      ];

      const mockStepEntries = [
        { user_id: 'user-1', step_count: 8500 },
        { user_id: 'user-2', step_count: 12000 },
      ];

      // Mock for friendships query
      const mockFriendshipsSelect = jest.fn().mockReturnThis();
      const mockFriendshipsEq = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });

      // Mock for step_entries query
      const mockStepsSelect = jest.fn().mockReturnThis();
      const mockStepsIn = jest.fn().mockReturnThis();
      const mockStepsEq = jest.fn().mockResolvedValue({
        data: mockStepEntries,
        error: null,
      });

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: mockFriendshipsSelect.mockReturnValue({
              eq: mockFriendshipsEq,
            }),
          };
        } else if (table === 'step_entries') {
          return {
            select: mockStepsSelect.mockReturnValue({
              in: mockStepsIn.mockReturnValue({
                eq: mockStepsEq,
              }),
            }),
          };
        }
      });

      const result = await friendsApi.getFriendsWithSteps();

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockSupabase.from).toHaveBeenCalledWith('step_entries');
      expect(result).toHaveLength(2);
      expect(result[0].today_steps).toBe(8500);
      expect(result[1].today_steps).toBe(12000);
    });

    it('should return empty array when no friendships', async () => {
      const mockFriendshipsSelect = jest.fn().mockReturnThis();
      const mockFriendshipsEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockFriendshipsSelect.mockReturnValue({
          eq: mockFriendshipsEq,
        }),
      });

      const result = await friendsApi.getFriendsWithSteps();

      expect(result).toEqual([]);
    });

    it('should return 0 steps for friends without step entries', async () => {
      const mockFriendships = [
        {
          id: 'friendship-1',
          friend_id: 'user-1',
          status: 'accepted',
          users: {
            id: 'user-1',
            display_name: 'John Doe',
            username: 'johndoe',
            avatar_url: null,
          },
        },
      ];

      const mockFriendshipsSelect = jest.fn().mockReturnThis();
      const mockFriendshipsEq = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });

      const mockStepsSelect = jest.fn().mockReturnThis();
      const mockStepsIn = jest.fn().mockReturnThis();
      const mockStepsEq = jest.fn().mockResolvedValue({
        data: [], // No step entries
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: mockFriendshipsSelect.mockReturnValue({
              eq: mockFriendshipsEq,
            }),
          };
        } else if (table === 'step_entries') {
          return {
            select: mockStepsSelect.mockReturnValue({
              in: mockStepsIn.mockReturnValue({
                eq: mockStepsEq,
              }),
            }),
          };
        }
      });

      const result = await friendsApi.getFriendsWithSteps();

      expect(result).toHaveLength(1);
      expect(result[0].today_steps).toBe(0);
    });

    it('should throw error when friendships fetch fails', async () => {
      const mockError = { message: 'Failed to fetch friendships' };

      const mockFriendshipsSelect = jest.fn().mockReturnThis();
      const mockFriendshipsEq = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockFriendshipsSelect.mockReturnValue({
          eq: mockFriendshipsEq,
        }),
      });

      await expect(friendsApi.getFriendsWithSteps()).rejects.toEqual(mockError);
    });

    it('should throw error when step entries fetch fails', async () => {
      const mockFriendships = [
        {
          id: 'friendship-1',
          friend_id: 'user-1',
          status: 'accepted',
          users: {
            id: 'user-1',
            display_name: 'John Doe',
            username: 'johndoe',
            avatar_url: null,
          },
        },
      ];

      const mockStepsError = { message: 'Failed to fetch steps' };

      const mockFriendshipsSelect = jest.fn().mockReturnThis();
      const mockFriendshipsEq = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });

      const mockStepsSelect = jest.fn().mockReturnThis();
      const mockStepsIn = jest.fn().mockReturnThis();
      const mockStepsEq = jest.fn().mockResolvedValue({
        data: null,
        error: mockStepsError,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: mockFriendshipsSelect.mockReturnValue({
              eq: mockFriendshipsEq,
            }),
          };
        } else if (table === 'step_entries') {
          return {
            select: mockStepsSelect.mockReturnValue({
              in: mockStepsIn.mockReturnValue({
                eq: mockStepsEq,
              }),
            }),
          };
        }
      });

      await expect(friendsApi.getFriendsWithSteps()).rejects.toEqual(mockStepsError);
    });

    it('should map friend data with steps correctly', async () => {
      const mockFriendships = [
        {
          id: 'friendship-1',
          friend_id: 'user-1',
          status: 'accepted',
          users: {
            id: 'user-1',
            display_name: 'Test User',
            username: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      ];

      const mockStepEntries = [
        { user_id: 'user-1', step_count: 5500 },
      ];

      const mockFriendshipsSelect = jest.fn().mockReturnThis();
      const mockFriendshipsEq = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });

      const mockStepsSelect = jest.fn().mockReturnThis();
      const mockStepsIn = jest.fn().mockReturnThis();
      const mockStepsEq = jest.fn().mockResolvedValue({
        data: mockStepEntries,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: mockFriendshipsSelect.mockReturnValue({
              eq: mockFriendshipsEq,
            }),
          };
        } else if (table === 'step_entries') {
          return {
            select: mockStepsSelect.mockReturnValue({
              in: mockStepsIn.mockReturnValue({
                eq: mockStepsEq,
              }),
            }),
          };
        }
      });

      const result = await friendsApi.getFriendsWithSteps();

      expect(result[0]).toEqual({
        id: 'friendship-1',
        user_id: 'user-1',
        display_name: 'Test User',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'accepted',
        today_steps: 5500,
      });
    });
  });

  describe('getRequests', () => {
    it('should fetch friend requests successfully', async () => {
      const mockData = [
        {
          id: 'request-1',
          user_id: 'user-3',
          status: 'pending',
          users: {
            id: 'user-3',
            display_name: 'Bob Wilson',
            username: 'bobwilson',
            avatar_url: null,
          },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await friendsApi.getRequests();

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('users!friendships_user_id_fkey'));
      expect(mockEq).toHaveBeenCalledWith('status', 'pending');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });

    it('should handle empty requests list', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      const result = await friendsApi.getRequests();

      expect(result).toEqual([]);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Fetch requests failed' };

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

      await expect(friendsApi.getRequests()).rejects.toEqual(mockError);
    });
  });

  describe('sendRequest', () => {
    it('should send friend request successfully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await friendsApi.sendRequest('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockInsert).toHaveBeenCalledWith({
        friend_id: 'user-123',
        status: 'pending',
      });
    });

    it('should throw error when send request fails', async () => {
      const mockError = { message: 'User not found' };

      const mockInsert = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await expect(friendsApi.sendRequest('invalid-user')).rejects.toEqual(mockError);
    });
  });

  describe('acceptRequest', () => {
    it('should accept friend request successfully', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEqUserId = jest.fn().mockReturnThis();
      const mockEqStatus = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEqUserId,
      });

      mockUpdate.mockReturnValue({
        eq: mockEqUserId,
      });

      mockEqUserId.mockReturnValue({
        eq: mockEqStatus,
      });

      await friendsApi.acceptRequest('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'accepted' });
      expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'pending');
    });

    it('should throw error when accept fails', async () => {
      const mockError = { message: 'Accept failed' };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEqUserId = jest.fn().mockReturnThis();
      const mockEqStatus = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEqUserId,
      });

      mockUpdate.mockReturnValue({
        eq: mockEqUserId,
      });

      mockEqUserId.mockReturnValue({
        eq: mockEqStatus,
      });

      await expect(friendsApi.acceptRequest('user-123')).rejects.toEqual(mockError);
    });
  });

  describe('declineRequest', () => {
    it('should decline friend request successfully', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEqUserId = jest.fn().mockReturnThis();
      const mockEqStatus = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEqUserId,
      });

      mockDelete.mockReturnValue({
        eq: mockEqUserId,
      });

      mockEqUserId.mockReturnValue({
        eq: mockEqStatus,
      });

      await friendsApi.declineRequest('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'pending');
    });

    it('should throw error when decline fails', async () => {
      const mockError = { message: 'Decline failed' };

      const mockDelete = jest.fn().mockReturnThis();
      const mockEqUserId = jest.fn().mockReturnThis();
      const mockEqStatus = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEqUserId,
      });

      mockDelete.mockReturnValue({
        eq: mockEqUserId,
      });

      mockEqUserId.mockReturnValue({
        eq: mockEqStatus,
      });

      await expect(friendsApi.declineRequest('user-123')).rejects.toEqual(mockError);
    });
  });

  describe('removeFriend', () => {
    it('should remove friend successfully', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEqFriendId = jest.fn().mockReturnThis();
      const mockEqStatus = jest.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEqFriendId,
      });

      mockDelete.mockReturnValue({
        eq: mockEqFriendId,
      });

      mockEqFriendId.mockReturnValue({
        eq: mockEqStatus,
      });

      await friendsApi.removeFriend('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEqFriendId).toHaveBeenCalledWith('friend_id', 'user-123');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'accepted');
    });

    it('should throw error when remove fails', async () => {
      const mockError = { message: 'Remove failed' };

      const mockDelete = jest.fn().mockReturnThis();
      const mockEqFriendId = jest.fn().mockReturnThis();
      const mockEqStatus = jest.fn().mockResolvedValue({
        error: mockError,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEqFriendId,
      });

      mockDelete.mockReturnValue({
        eq: mockEqFriendId,
      });

      mockEqFriendId.mockReturnValue({
        eq: mockEqStatus,
      });

      await expect(friendsApi.removeFriend('user-123')).rejects.toEqual(mockError);
    });
  });
});

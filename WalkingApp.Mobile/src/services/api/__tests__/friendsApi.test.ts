import { friendsApi } from '../friendsApi';
import { supabase } from '@services/supabase';

// Mock user ID for tests
const MOCK_USER_ID = 'current-user-id';

// Mock the supabase client
jest.mock('@services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockGetUser = supabase.auth.getUser as jest.Mock;

describe('friendsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user is authenticated
    mockGetUser.mockResolvedValue({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
  });

  describe('getFriends', () => {
    it('should fetch friends successfully', async () => {
      // Mock friendships data (using correct column names)
      const mockFriendships = [
        {
          id: 'friendship-1',
          requester_id: MOCK_USER_ID,
          addressee_id: 'user-1',
          status: 'accepted',
        },
        {
          id: 'friendship-2',
          requester_id: 'user-2',
          addressee_id: MOCK_USER_ID,
          status: 'accepted',
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          display_name: 'John Doe',
          avatar_url: 'https://example.com/john.jpg',
        },
        {
          id: 'user-2',
          display_name: 'Jane Smith',
          avatar_url: null,
        },
      ];

      // Setup mock chain for friendships query
      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      // Setup mock chain for users query
      const mockUsersIn = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        in: mockUsersIn,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        } else if (table === 'users') {
          return { select: mockUsersSelect };
        }
      });

      const result = await friendsApi.getFriends();

      expect(mockGetUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(result).toHaveLength(2);
      expect(result[0].display_name).toBe('John Doe');
      expect(result[0].user_id).toBe('user-1');
      expect(result[1].display_name).toBe('Jane Smith');
      expect(result[1].user_id).toBe('user-2');
    });

    it('should handle empty friends list', async () => {
      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockFriendshipsSelect,
      });

      const result = await friendsApi.getFriends();

      expect(result).toEqual([]);
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(friendsApi.getFriends()).rejects.toThrow('Not authenticated');
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Fetch failed' };

      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockFriendshipsSelect,
      });

      await expect(friendsApi.getFriends()).rejects.toEqual(mockError);
    });

    it('should map database fields to Friend type correctly', async () => {
      const mockFriendships = [
        {
          id: 'friendship-1',
          requester_id: MOCK_USER_ID,
          addressee_id: 'user-1',
          status: 'accepted',
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          display_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      ];

      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      const mockUsersIn = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        in: mockUsersIn,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        } else if (table === 'users') {
          return { select: mockUsersSelect };
        }
      });

      const result = await friendsApi.getFriends();

      expect(result[0]).toEqual({
        id: 'friendship-1',
        user_id: 'user-1',
        display_name: 'Test User',
        username: 'Test User', // Falls back to display_name
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
          requester_id: MOCK_USER_ID,
          addressee_id: 'user-1',
          status: 'accepted',
        },
        {
          id: 'friendship-2',
          requester_id: 'user-2',
          addressee_id: MOCK_USER_ID,
          status: 'accepted',
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          display_name: 'John Doe',
          avatar_url: 'https://example.com/john.jpg',
        },
        {
          id: 'user-2',
          display_name: 'Jane Smith',
          avatar_url: null,
        },
      ];

      const mockStepEntries = [
        { user_id: 'user-1', step_count: 8500 },
        { user_id: 'user-2', step_count: 12000 },
      ];

      // Mock friendships query
      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      // Mock users query
      const mockUsersIn = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        in: mockUsersIn,
      });

      // Mock step_entries query
      const mockStepsEq = jest.fn().mockResolvedValue({
        data: mockStepEntries,
        error: null,
      });
      const mockStepsIn = jest.fn().mockReturnValue({
        eq: mockStepsEq,
      });
      const mockStepsSelect = jest.fn().mockReturnValue({
        in: mockStepsIn,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        } else if (table === 'users') {
          return { select: mockUsersSelect };
        } else if (table === 'step_entries') {
          return { select: mockStepsSelect };
        }
      });

      const result = await friendsApi.getFriendsWithSteps();

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from).toHaveBeenCalledWith('step_entries');
      expect(result).toHaveLength(2);
      expect(result[0].today_steps).toBe(8500);
      expect(result[1].today_steps).toBe(12000);
    });

    it('should return empty array when no friendships', async () => {
      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockFriendshipsSelect,
      });

      const result = await friendsApi.getFriendsWithSteps();

      expect(result).toEqual([]);
    });

    it('should return 0 steps for friends without step entries', async () => {
      const mockFriendships = [
        {
          id: 'friendship-1',
          requester_id: MOCK_USER_ID,
          addressee_id: 'user-1',
          status: 'accepted',
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          display_name: 'John Doe',
          avatar_url: null,
        },
      ];

      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      const mockUsersIn = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        in: mockUsersIn,
      });

      const mockStepsEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockStepsIn = jest.fn().mockReturnValue({
        eq: mockStepsEq,
      });
      const mockStepsSelect = jest.fn().mockReturnValue({
        in: mockStepsIn,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        } else if (table === 'users') {
          return { select: mockUsersSelect };
        } else if (table === 'step_entries') {
          return { select: mockStepsSelect };
        }
      });

      const result = await friendsApi.getFriendsWithSteps();

      expect(result).toHaveLength(1);
      expect(result[0].today_steps).toBe(0);
    });

    it('should throw error when friendships fetch fails', async () => {
      const mockError = { message: 'Failed to fetch friendships' };

      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockFriendshipsSelect,
      });

      await expect(friendsApi.getFriendsWithSteps()).rejects.toEqual(mockError);
    });

    it('should throw error when step entries fetch fails', async () => {
      const mockFriendships = [
        {
          id: 'friendship-1',
          requester_id: MOCK_USER_ID,
          addressee_id: 'user-1',
          status: 'accepted',
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          display_name: 'John Doe',
          avatar_url: null,
        },
      ];

      const mockStepsError = { message: 'Failed to fetch steps' };

      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      const mockUsersIn = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        in: mockUsersIn,
      });

      const mockStepsEq = jest.fn().mockResolvedValue({
        data: null,
        error: mockStepsError,
      });
      const mockStepsIn = jest.fn().mockReturnValue({
        eq: mockStepsEq,
      });
      const mockStepsSelect = jest.fn().mockReturnValue({
        in: mockStepsIn,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        } else if (table === 'users') {
          return { select: mockUsersSelect };
        } else if (table === 'step_entries') {
          return { select: mockStepsSelect };
        }
      });

      await expect(friendsApi.getFriendsWithSteps()).rejects.toEqual(mockStepsError);
    });

    it('should map friend data with steps correctly', async () => {
      const mockFriendships = [
        {
          id: 'friendship-1',
          requester_id: MOCK_USER_ID,
          addressee_id: 'user-1',
          status: 'accepted',
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          display_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      ];

      const mockStepEntries = [
        { user_id: 'user-1', step_count: 5500 },
      ];

      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });
      const mockFriendshipsEq = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEq,
      });

      const mockUsersIn = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        in: mockUsersIn,
      });

      const mockStepsEq = jest.fn().mockResolvedValue({
        data: mockStepEntries,
        error: null,
      });
      const mockStepsIn = jest.fn().mockReturnValue({
        eq: mockStepsEq,
      });
      const mockStepsSelect = jest.fn().mockReturnValue({
        in: mockStepsIn,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        } else if (table === 'users') {
          return { select: mockUsersSelect };
        } else if (table === 'step_entries') {
          return { select: mockStepsSelect };
        }
      });

      const result = await friendsApi.getFriendsWithSteps();

      expect(result[0]).toEqual({
        id: 'friendship-1',
        user_id: 'user-1',
        display_name: 'Test User',
        username: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'accepted',
        today_steps: 5500,
      });
    });
  });

  describe('getRequests', () => {
    it('should fetch friend requests successfully', async () => {
      const mockFriendships = [
        {
          id: 'request-1',
          requester_id: 'user-3',
          status: 'pending',
        },
      ];

      const mockUsers = [
        {
          id: 'user-3',
          display_name: 'Bob Wilson',
          avatar_url: null,
        },
      ];

      // Mock friendships query (addressee_id = current user, status = pending)
      const mockFriendshipsEqStatus = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });
      const mockFriendshipsEqAddressee = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqStatus,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqAddressee,
      });

      // Mock users query
      const mockUsersIn = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        in: mockUsersIn,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        } else if (table === 'users') {
          return { select: mockUsersSelect };
        }
      });

      const result = await friendsApi.getRequests();

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
      expect(result[0].user_id).toBe('user-3');
    });

    it('should handle empty requests list', async () => {
      const mockFriendshipsEqStatus = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockFriendshipsEqAddressee = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqStatus,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqAddressee,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockFriendshipsSelect,
      });

      const result = await friendsApi.getRequests();

      expect(result).toEqual([]);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Fetch requests failed' };

      const mockFriendshipsEqStatus = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });
      const mockFriendshipsEqAddressee = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqStatus,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqAddressee,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockFriendshipsSelect,
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
        requester_id: MOCK_USER_ID,
        addressee_id: 'user-123',
        status: 'pending',
      });
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(friendsApi.sendRequest('user-123')).rejects.toThrow('Not authenticated');
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
      const mockEqStatus = jest.fn().mockResolvedValue({
        error: null,
      });
      const mockEqAddressee = jest.fn().mockReturnValue({
        eq: mockEqStatus,
      });
      const mockEqRequester = jest.fn().mockReturnValue({
        eq: mockEqAddressee,
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEqRequester,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      await friendsApi.acceptRequest('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));
      expect(mockEqRequester).toHaveBeenCalledWith('requester_id', 'user-123');
      expect(mockEqAddressee).toHaveBeenCalledWith('addressee_id', MOCK_USER_ID);
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'pending');
    });

    it('should throw error when accept fails', async () => {
      const mockError = { message: 'Accept failed' };

      const mockEqStatus = jest.fn().mockResolvedValue({
        error: mockError,
      });
      const mockEqAddressee = jest.fn().mockReturnValue({
        eq: mockEqStatus,
      });
      const mockEqRequester = jest.fn().mockReturnValue({
        eq: mockEqAddressee,
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEqRequester,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      await expect(friendsApi.acceptRequest('user-123')).rejects.toEqual(mockError);
    });
  });

  describe('declineRequest', () => {
    it('should decline friend request successfully', async () => {
      const mockEqStatus = jest.fn().mockResolvedValue({
        error: null,
      });
      const mockEqAddressee = jest.fn().mockReturnValue({
        eq: mockEqStatus,
      });
      const mockEqRequester = jest.fn().mockReturnValue({
        eq: mockEqAddressee,
      });
      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEqRequester,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await friendsApi.declineRequest('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEqRequester).toHaveBeenCalledWith('requester_id', 'user-123');
      expect(mockEqAddressee).toHaveBeenCalledWith('addressee_id', MOCK_USER_ID);
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'pending');
    });

    it('should throw error when decline fails', async () => {
      const mockError = { message: 'Decline failed' };

      const mockEqStatus = jest.fn().mockResolvedValue({
        error: mockError,
      });
      const mockEqAddressee = jest.fn().mockReturnValue({
        eq: mockEqStatus,
      });
      const mockEqRequester = jest.fn().mockReturnValue({
        eq: mockEqAddressee,
      });
      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEqRequester,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await expect(friendsApi.declineRequest('user-123')).rejects.toEqual(mockError);
    });
  });

  describe('removeFriend', () => {
    it('should remove friend successfully (current user is requester)', async () => {
      // First delete succeeds
      const mockEqStatus1 = jest.fn().mockResolvedValue({
        error: null,
      });
      const mockEqAddressee1 = jest.fn().mockReturnValue({
        eq: mockEqStatus1,
      });
      const mockEqRequester1 = jest.fn().mockReturnValue({
        eq: mockEqAddressee1,
      });
      const mockDelete1 = jest.fn().mockReturnValue({
        eq: mockEqRequester1,
      });

      // Second delete also runs (but we don't care about result if first succeeds)
      const mockEqStatus2 = jest.fn().mockResolvedValue({
        error: null,
      });
      const mockEqAddressee2 = jest.fn().mockReturnValue({
        eq: mockEqStatus2,
      });
      const mockEqRequester2 = jest.fn().mockReturnValue({
        eq: mockEqAddressee2,
      });
      const mockDelete2 = jest.fn().mockReturnValue({
        eq: mockEqRequester2,
      });

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { delete: mockDelete1 };
        } else {
          return { delete: mockDelete2 };
        }
      });

      await friendsApi.removeFriend('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
    });

    it('should throw error when both remove attempts fail', async () => {
      const mockError = { message: 'Remove failed' };

      const mockEqStatus = jest.fn().mockResolvedValue({
        error: mockError,
      });
      const mockEqOther = jest.fn().mockReturnValue({
        eq: mockEqStatus,
      });
      const mockEqUser = jest.fn().mockReturnValue({
        eq: mockEqOther,
      });
      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEqUser,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await expect(friendsApi.removeFriend('user-123')).rejects.toEqual(mockError);
    });
  });

  describe('searchUsers', () => {
    it('should search users by display_name', async () => {
      const mockUsers = [
        { id: 'user-1', display_name: 'Alice', avatar_url: 'https://example.com/alice.jpg' },
        { id: 'user-2', display_name: 'Alicia', avatar_url: null },
      ];

      const mockUsersLimit = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersIlike = jest.fn().mockReturnValue({
        limit: mockUsersLimit,
      });
      const mockUsersNeq = jest.fn().mockReturnValue({
        ilike: mockUsersIlike,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        neq: mockUsersNeq,
      });

      // Mock friendships query (no existing friendships)
      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: mockUsersSelect };
        } else if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        }
      });

      const result = await friendsApi.searchUsers('Ali');

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockUsersIlike).toHaveBeenCalledWith('display_name', '%Ali%');
      expect(result).toHaveLength(2);
      expect(result[0].display_name).toBe('Alice');
    });

    it('should return empty array for empty query', async () => {
      const result = await friendsApi.searchUsers('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const result = await friendsApi.searchUsers('   ');
      expect(result).toEqual([]);
    });

    it('should exclude users with existing friendships', async () => {
      const mockUsers = [
        { id: 'user-1', display_name: 'Alice', avatar_url: null },
        { id: 'user-2', display_name: 'Alicia', avatar_url: null },
      ];

      const mockFriendships = [
        { requester_id: MOCK_USER_ID, addressee_id: 'user-1' },
      ];

      const mockUsersLimit = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersIlike = jest.fn().mockReturnValue({
        limit: mockUsersLimit,
      });
      const mockUsersNeq = jest.fn().mockReturnValue({
        ilike: mockUsersIlike,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        neq: mockUsersNeq,
      });

      const mockFriendshipsOr = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        or: mockFriendshipsOr,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: mockUsersSelect };
        } else if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        }
      });

      const result = await friendsApi.searchUsers('Ali');

      // user-1 should be filtered out since they have an existing friendship
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-2');
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(friendsApi.searchUsers('test')).rejects.toThrow('Not authenticated');
    });
  });

  describe('getOutgoingRequests', () => {
    it('should fetch outgoing requests successfully', async () => {
      const mockFriendships = [
        { id: 'request-1', addressee_id: 'user-1', created_at: '2024-01-15T10:00:00Z' },
        { id: 'request-2', addressee_id: 'user-2', created_at: '2024-01-14T10:00:00Z' },
      ];

      const mockUsers = [
        { id: 'user-1', display_name: 'John Doe', avatar_url: 'https://example.com/john.jpg' },
        { id: 'user-2', display_name: 'Jane Smith', avatar_url: null },
      ];

      const mockFriendshipsOrder = jest.fn().mockResolvedValue({
        data: mockFriendships,
        error: null,
      });
      const mockFriendshipsEqStatus = jest.fn().mockReturnValue({
        order: mockFriendshipsOrder,
      });
      const mockFriendshipsEqRequester = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqStatus,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqRequester,
      });

      const mockUsersIn = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });
      const mockUsersSelect = jest.fn().mockReturnValue({
        in: mockUsersIn,
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'friendships') {
          return { select: mockFriendshipsSelect };
        } else if (table === 'users') {
          return { select: mockUsersSelect };
        }
      });

      const result = await friendsApi.getOutgoingRequests();

      expect(result).toHaveLength(2);
      expect(result[0].display_name).toBe('John Doe');
      expect(result[0].created_at).toBe('2024-01-15T10:00:00Z');
      expect(result[1].display_name).toBe('Jane Smith');
    });

    it('should return empty array when no outgoing requests', async () => {
      const mockFriendshipsOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockFriendshipsEqStatus = jest.fn().mockReturnValue({
        order: mockFriendshipsOrder,
      });
      const mockFriendshipsEqRequester = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqStatus,
      });
      const mockFriendshipsSelect = jest.fn().mockReturnValue({
        eq: mockFriendshipsEqRequester,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockFriendshipsSelect,
      });

      const result = await friendsApi.getOutgoingRequests();

      expect(result).toEqual([]);
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(friendsApi.getOutgoingRequests()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getUserById', () => {
    it('should fetch user by ID successfully', async () => {
      const mockUser = {
        id: 'user-123',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUser,
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await friendsApi.getUserById('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
      expect(result).toEqual({
        id: 'user-123',
        display_name: 'Test User',
        username: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });

    it('should return null when user not found', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      });
      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await friendsApi.getUserById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when fetching own user ID', async () => {
      await expect(friendsApi.getUserById(MOCK_USER_ID)).rejects.toThrow(
        'Cannot add yourself as a friend'
      );
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(friendsApi.getUserById('user-123')).rejects.toThrow('Not authenticated');
    });
  });

  describe('checkFriendshipStatus', () => {
    it('should return "none" when no friendship exists', async () => {
      const mockOr = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({
        or: mockOr,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('none');
    });

    it('should return "accepted" when friendship is accepted', async () => {
      const mockOr = jest.fn().mockResolvedValue({
        data: [{ requester_id: MOCK_USER_ID, addressee_id: 'user-123', status: 'accepted' }],
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({
        or: mockOr,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('accepted');
    });

    it('should return "pending_sent" when current user sent the request', async () => {
      const mockOr = jest.fn().mockResolvedValue({
        data: [{ requester_id: MOCK_USER_ID, addressee_id: 'user-123', status: 'pending' }],
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({
        or: mockOr,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('pending_sent');
    });

    it('should return "pending_received" when current user received the request', async () => {
      const mockOr = jest.fn().mockResolvedValue({
        data: [{ requester_id: 'user-123', addressee_id: MOCK_USER_ID, status: 'pending' }],
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({
        or: mockOr,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('pending_received');
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(friendsApi.checkFriendshipStatus('user-123')).rejects.toThrow(
        'Not authenticated'
      );
    });
  });

  describe('cancelRequest', () => {
    it('should cancel outgoing request successfully', async () => {
      const mockEqStatus = jest.fn().mockResolvedValue({
        error: null,
      });
      const mockEqAddressee = jest.fn().mockReturnValue({
        eq: mockEqStatus,
      });
      const mockEqRequester = jest.fn().mockReturnValue({
        eq: mockEqAddressee,
      });
      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEqRequester,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await friendsApi.cancelRequest('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEqRequester).toHaveBeenCalledWith('requester_id', MOCK_USER_ID);
      expect(mockEqAddressee).toHaveBeenCalledWith('addressee_id', 'user-123');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'pending');
    });

    it('should throw error when cancel fails', async () => {
      const mockError = { message: 'Cancel failed' };

      const mockEqStatus = jest.fn().mockResolvedValue({
        error: mockError,
      });
      const mockEqAddressee = jest.fn().mockReturnValue({
        eq: mockEqStatus,
      });
      const mockEqRequester = jest.fn().mockReturnValue({
        eq: mockEqAddressee,
      });
      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEqRequester,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await expect(friendsApi.cancelRequest('user-123')).rejects.toEqual(mockError);
    });

    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(friendsApi.cancelRequest('user-123')).rejects.toThrow('Not authenticated');
    });
  });
});

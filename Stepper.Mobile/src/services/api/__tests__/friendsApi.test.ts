import { friendsApi } from '../friendsApi';
import { apiClient } from '../client';

// Mock the apiClient
jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('friendsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFriends', () => {
    it('should fetch friends successfully and map to mobile format', async () => {
      const mockResponse = {
        friends: [
          {
            userId: 'user-1',
            displayName: 'John Doe',
            avatarUrl: 'https://example.com/john.jpg',
            friendsSince: '2024-01-01T00:00:00Z',
            todaySteps: 8500,
          },
          {
            userId: 'user-2',
            displayName: 'Jane Smith',
            avatarUrl: null,
            friendsSince: '2024-01-15T00:00:00Z',
            todaySteps: 12000,
          },
        ],
        totalCount: 2,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await friendsApi.getFriends();

      expect(mockApiClient.get).toHaveBeenCalledWith('/friends');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'user-1',
        user_id: 'user-1',
        display_name: 'John Doe',
        username: 'John Doe',
        avatar_url: 'https://example.com/john.jpg',
        today_steps: 8500,
        status: 'accepted',
      });
      expect(result[1]).toEqual({
        id: 'user-2',
        user_id: 'user-2',
        display_name: 'Jane Smith',
        username: 'Jane Smith',
        avatar_url: null,
        today_steps: 12000,
        status: 'accepted',
      });
    });

    it('should handle empty friends list', async () => {
      mockApiClient.get.mockResolvedValue({ friends: [], totalCount: 0 });

      const result = await friendsApi.getFriends();

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      const mockError = new Error('Network error');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(friendsApi.getFriends()).rejects.toThrow('Network error');
    });

    it('should default todaySteps to 0 when not provided', async () => {
      const mockResponse = {
        friends: [
          {
            userId: 'user-1',
            displayName: 'John Doe',
            avatarUrl: null,
            friendsSince: '2024-01-01T00:00:00Z',
            // todaySteps not provided
          },
        ],
        totalCount: 1,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await friendsApi.getFriends();

      expect(result[0].today_steps).toBe(0);
    });
  });

  describe('getIncomingRequests', () => {
    it('should fetch incoming requests and map to mobile format', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          requesterId: 'user-3',
          requesterDisplayName: 'Bob Wilson',
          requesterAvatarUrl: 'https://example.com/bob.jpg',
          status: 'pending',
          createdAt: '2024-01-20T10:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockRequests);

      const result = await friendsApi.getIncomingRequests();

      expect(mockApiClient.get).toHaveBeenCalledWith('/friends/requests/incoming');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'request-1',
        user_id: 'user-3',
        display_name: 'Bob Wilson',
        username: 'Bob Wilson',
        avatar_url: 'https://example.com/bob.jpg',
        status: 'pending',
      });
    });

    it('should handle empty requests list', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await friendsApi.getIncomingRequests();

      expect(result).toEqual([]);
    });
  });

  describe('getRequests', () => {
    it('should be an alias for getIncomingRequests', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          requesterId: 'user-3',
          requesterDisplayName: 'Bob Wilson',
          requesterAvatarUrl: null,
          status: 'pending',
          createdAt: '2024-01-20T10:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockRequests);

      const result = await friendsApi.getRequests();

      expect(mockApiClient.get).toHaveBeenCalledWith('/friends/requests/incoming');
      expect(result[0].user_id).toBe('user-3');
    });
  });

  describe('getOutgoingRequests', () => {
    it('should fetch outgoing requests and map to mobile format', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          requesterId: 'current-user',
          requesterDisplayName: 'Me',
          requesterAvatarUrl: null,
          addresseeId: 'user-1',
          addresseeDisplayName: 'John Doe',
          addresseeAvatarUrl: 'https://example.com/john.jpg',
          status: 'pending',
          createdAt: '2024-01-20T10:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockRequests);

      const result = await friendsApi.getOutgoingRequests();

      expect(mockApiClient.get).toHaveBeenCalledWith('/friends/requests/outgoing');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'request-1',
        user_id: 'user-1',
        display_name: 'John Doe',
        username: 'John Doe',
        avatar_url: 'https://example.com/john.jpg',
        created_at: '2024-01-20T10:00:00Z',
      });
    });

    it('should handle missing addressee fields', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          requesterId: 'current-user',
          requesterDisplayName: 'Me',
          status: 'pending',
          createdAt: '2024-01-20T10:00:00Z',
          // addressee fields missing
        },
      ];

      mockApiClient.get.mockResolvedValue(mockRequests);

      const result = await friendsApi.getOutgoingRequests();

      expect(result[0].user_id).toBe('');
      expect(result[0].display_name).toBe('Unknown');
    });
  });

  describe('sendRequest', () => {
    it('should send friend request with correct payload', async () => {
      mockApiClient.post.mockResolvedValue({});

      await friendsApi.sendRequest('user-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/friends/requests', {
        friendUserId: 'user-123',
      });
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('User not found');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(friendsApi.sendRequest('invalid-user')).rejects.toThrow('User not found');
    });
  });

  describe('acceptRequest', () => {
    it('should accept friend request with request ID', async () => {
      mockApiClient.post.mockResolvedValue({});

      await friendsApi.acceptRequest('request-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/friends/requests/request-123/accept');
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Request not found');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(friendsApi.acceptRequest('invalid-request')).rejects.toThrow('Request not found');
    });
  });

  describe('declineRequest', () => {
    it('should decline friend request with request ID', async () => {
      mockApiClient.post.mockResolvedValue({});

      await friendsApi.declineRequest('request-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/friends/requests/request-123/reject');
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Request not found');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(friendsApi.declineRequest('invalid-request')).rejects.toThrow('Request not found');
    });
  });

  describe('cancelRequest', () => {
    it('should cancel outgoing friend request', async () => {
      mockApiClient.delete.mockResolvedValue({});

      await friendsApi.cancelRequest('request-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/friends/requests/request-123');
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Request not found');
      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(friendsApi.cancelRequest('invalid-request')).rejects.toThrow('Request not found');
    });
  });

  describe('removeFriend', () => {
    it('should remove friend with user ID', async () => {
      mockApiClient.delete.mockResolvedValue({});

      await friendsApi.removeFriend('user-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/friends/user-123');
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Friend not found');
      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(friendsApi.removeFriend('invalid-user')).rejects.toThrow('Friend not found');
    });
  });

  describe('searchUsers', () => {
    it('should search users and map results to mobile format', async () => {
      const mockResponse = {
        users: [
          {
            id: 'user-1',
            displayName: 'Alice',
            avatarUrl: 'https://example.com/alice.jpg',
            friendshipStatus: 'none',
          },
          {
            id: 'user-2',
            displayName: 'Alicia',
            avatarUrl: null,
            friendshipStatus: 'pending_sent',
          },
        ],
        totalCount: 2,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await friendsApi.searchUsers('Ali');

      expect(mockApiClient.get).toHaveBeenCalledWith('/friends/discovery/search?query=Ali');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'user-1',
        display_name: 'Alice',
        username: 'Alice',
        avatar_url: 'https://example.com/alice.jpg',
        friendship_status: 'none',
      });
    });

    it('should return empty array for empty query', async () => {
      const result = await friendsApi.searchUsers('');

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const result = await friendsApi.searchUsers('   ');

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should URL encode the query', async () => {
      mockApiClient.get.mockResolvedValue({ users: [], totalCount: 0 });

      await friendsApi.searchUsers('John Doe');

      expect(mockApiClient.get).toHaveBeenCalledWith('/friends/discovery/search?query=John%20Doe');
    });
  });

  describe('getUserById', () => {
    it('should fetch user by ID and map to mobile format', async () => {
      const mockUser = {
        id: 'user-123',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        friendshipStatus: 'none',
      };

      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await friendsApi.getUserById('user-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/friends/discovery/qr-code/user-123');
      expect(result).toEqual({
        id: 'user-123',
        display_name: 'Test User',
        username: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        friendship_status: 'none',
      });
    });

    it('should return null when user not found (404)', async () => {
      const error = { statusCode: 404, message: 'Not found' };
      mockApiClient.get.mockRejectedValue(error);

      const result = await friendsApi.getUserById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw other errors', async () => {
      const error = new Error('Network error');
      mockApiClient.get.mockRejectedValue(error);

      await expect(friendsApi.getUserById('user-123')).rejects.toThrow('Network error');
    });
  });

  describe('checkFriendshipStatus', () => {
    it('should return "none" when no friendship exists', async () => {
      const mockUser = {
        id: 'user-123',
        displayName: 'Test User',
        avatarUrl: null,
        friendshipStatus: 'none',
      };

      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('none');
    });

    it('should return "accepted" when already friends', async () => {
      const mockUser = {
        id: 'user-123',
        displayName: 'Test User',
        avatarUrl: null,
        friendshipStatus: 'accepted',
      };

      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('accepted');
    });

    it('should return "accepted" for "friends" status', async () => {
      const mockUser = {
        id: 'user-123',
        displayName: 'Test User',
        avatarUrl: null,
        friendshipStatus: 'friends',
      };

      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('accepted');
    });

    it('should return "pending_sent" for outgoing request', async () => {
      const mockUser = {
        id: 'user-123',
        displayName: 'Test User',
        avatarUrl: null,
        friendshipStatus: 'pending_sent',
      };

      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('pending_sent');
    });

    it('should return "pending_sent" for "pending_outgoing" status', async () => {
      const mockUser = {
        id: 'user-123',
        displayName: 'Test User',
        avatarUrl: null,
        friendshipStatus: 'pending_outgoing',
      };

      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('pending_sent');
    });

    it('should return "pending_received" for incoming request', async () => {
      const mockUser = {
        id: 'user-123',
        displayName: 'Test User',
        avatarUrl: null,
        friendshipStatus: 'pending_received',
      };

      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('pending_received');
    });

    it('should return "pending_received" for "pending_incoming" status', async () => {
      const mockUser = {
        id: 'user-123',
        displayName: 'Test User',
        avatarUrl: null,
        friendshipStatus: 'pending_incoming',
      };

      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('pending_received');
    });

    it('should return "none" on error', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('none');
    });

    it('should return "none" for unknown status', async () => {
      const mockUser = {
        id: 'user-123',
        displayName: 'Test User',
        avatarUrl: null,
        friendshipStatus: 'unknown_status',
      };

      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await friendsApi.checkFriendshipStatus('user-123');

      expect(result).toBe('none');
    });
  });
});

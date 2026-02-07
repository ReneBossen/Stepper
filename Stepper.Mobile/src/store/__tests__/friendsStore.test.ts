import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useFriendsStore, Friend } from '../friendsStore';
import { friendsApi } from '@services/api/friendsApi';

// Mock the friends API
jest.mock('@services/api/friendsApi');

const mockFriendsApi = friendsApi as jest.Mocked<typeof friendsApi>;

describe('friendsStore', () => {
  const mockFriends: Friend[] = [
    {
      id: 'friendship-1',
      user_id: 'user-1',
      display_name: 'John Doe',
      username: 'johndoe',
      avatar_url: 'https://example.com/john.jpg',
      today_steps: 8500,
      status: 'accepted',
    },
    {
      id: 'friendship-2',
      user_id: 'user-2',
      display_name: 'Jane Smith',
      username: 'janesmith',
      avatar_url: 'https://example.com/jane.jpg',
      today_steps: 10200,
      status: 'accepted',
    },
  ];

  const mockRequests: Friend[] = [
    {
      id: 'request-1',
      user_id: 'user-3',
      display_name: 'Bob Wilson',
      username: 'bobwilson',
      status: 'pending',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    useFriendsStore.setState({
      friends: [],
      requests: [],
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useFriendsStore());

      expect(result.current.friends).toEqual([]);
      expect(result.current.requests).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchFriends', () => {
    it('should fetch friends successfully', async () => {
      mockFriendsApi.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchFriends();
      });

      expect(mockFriendsApi.getFriends).toHaveBeenCalled();
      expect(result.current.friends).toEqual(mockFriends);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty friends list', async () => {
      mockFriendsApi.getFriends.mockResolvedValue([]);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchFriends();
      });

      expect(result.current.friends).toEqual([]);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch friends');
      mockFriendsApi.getFriends.mockRejectedValue(error);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchFriends();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch friends');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      mockFriendsApi.getFriends.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockFriends), 100))
      );

      const { result } = renderHook(() => useFriendsStore());

      act(() => {
        result.current.fetchFriends();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear previous errors on fetch', async () => {
      mockFriendsApi.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ error: 'Previous error' });

      await act(async () => {
        await result.current.fetchFriends();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchFriendsWithSteps', () => {
    it('should fetch friends with steps successfully (calls getFriends)', async () => {
      mockFriendsApi.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchFriendsWithSteps();
      });

      expect(mockFriendsApi.getFriends).toHaveBeenCalled();
      expect(result.current.friends).toEqual(mockFriends);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty friends list', async () => {
      mockFriendsApi.getFriends.mockResolvedValue([]);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchFriendsWithSteps();
      });

      expect(result.current.friends).toEqual([]);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch friends with steps');
      mockFriendsApi.getFriends.mockRejectedValue(error);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchFriendsWithSteps();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch friends with steps');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      mockFriendsApi.getFriends.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockFriends), 100))
      );

      const { result } = renderHook(() => useFriendsStore());

      act(() => {
        result.current.fetchFriendsWithSteps();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear previous errors on fetch', async () => {
      mockFriendsApi.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ error: 'Previous error' });

      await act(async () => {
        await result.current.fetchFriendsWithSteps();
      });

      expect(result.current.error).toBeNull();
    });

    it('should return friends with today_steps populated', async () => {
      const friendsWithSteps = [
        { ...mockFriends[0], today_steps: 5000 },
        { ...mockFriends[1], today_steps: 12000 },
      ];
      mockFriendsApi.getFriends.mockResolvedValue(friendsWithSteps);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchFriendsWithSteps();
      });

      expect(result.current.friends[0].today_steps).toBe(5000);
      expect(result.current.friends[1].today_steps).toBe(12000);
    });
  });

  describe('fetchRequests', () => {
    it('should fetch friend requests successfully', async () => {
      mockFriendsApi.getRequests.mockResolvedValue(mockRequests);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchRequests();
      });

      expect(mockFriendsApi.getRequests).toHaveBeenCalled();
      expect(result.current.requests).toEqual(mockRequests);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty requests list', async () => {
      mockFriendsApi.getRequests.mockResolvedValue([]);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchRequests();
      });

      expect(result.current.requests).toEqual([]);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch requests');
      mockFriendsApi.getRequests.mockRejectedValue(error);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.fetchRequests();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch requests');
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('sendRequest', () => {
    it('should send friend request successfully', async () => {
      mockFriendsApi.sendRequest.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFriendsStore());

      await act(async () => {
        await result.current.sendRequest('user-123');
      });

      expect(mockFriendsApi.sendRequest).toHaveBeenCalledWith('user-123');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle send request error', async () => {
      const error = new Error('User not found');
      mockFriendsApi.sendRequest.mockRejectedValue(error);

      const { result } = renderHook(() => useFriendsStore());

      try {
        await act(async () => {
          await result.current.sendRequest('invalid-user');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('User not found');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during send', async () => {
      mockFriendsApi.sendRequest.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      const { result } = renderHook(() => useFriendsStore());

      act(() => {
        result.current.sendRequest('user-123');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('acceptRequest', () => {
    it('should accept friend request successfully', async () => {
      mockFriendsApi.acceptRequest.mockResolvedValue(undefined);
      mockFriendsApi.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ requests: mockRequests });

      await act(async () => {
        await result.current.acceptRequest('user-3');
      });

      // Store looks up request ID from user ID, so API is called with request-1
      expect(mockFriendsApi.acceptRequest).toHaveBeenCalledWith('request-1');
      expect(mockFriendsApi.getFriends).toHaveBeenCalled();
      expect(result.current.requests).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should remove request from list after acceptance', async () => {
      const multipleRequests = [
        ...mockRequests,
        { ...mockRequests[0], id: 'request-2', user_id: 'user-4' },
      ];

      mockFriendsApi.acceptRequest.mockResolvedValue(undefined);
      mockFriendsApi.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ requests: multipleRequests });

      await act(async () => {
        await result.current.acceptRequest('user-3');
      });

      expect(result.current.requests).toHaveLength(1);
      expect(result.current.requests[0].user_id).toBe('user-4');
    });

    it('should handle accept error', async () => {
      const error = new Error('Accept failed');
      mockFriendsApi.acceptRequest.mockRejectedValue(error);
      mockFriendsApi.getRequests.mockResolvedValue(mockRequests);

      const { result } = renderHook(() => useFriendsStore());

      // Set up requests so the store can find the request ID
      useFriendsStore.setState({ requests: mockRequests });

      try {
        await act(async () => {
          await result.current.acceptRequest('user-3');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Accept failed');
      });
    });

    it('should refresh friends list after accepting', async () => {
      mockFriendsApi.acceptRequest.mockResolvedValue(undefined);
      mockFriendsApi.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ requests: mockRequests, friends: [] });

      await act(async () => {
        await result.current.acceptRequest('user-3');
      });

      expect(result.current.friends).toEqual(mockFriends);
    });
  });

  describe('declineRequest', () => {
    it('should decline friend request successfully', async () => {
      mockFriendsApi.declineRequest.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ requests: mockRequests });

      await act(async () => {
        await result.current.declineRequest('user-3');
      });

      // Store looks up request ID from user ID, so API is called with request-1
      expect(mockFriendsApi.declineRequest).toHaveBeenCalledWith('request-1');
      expect(result.current.requests).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should remove declined request from list', async () => {
      const multipleRequests = [
        ...mockRequests,
        { ...mockRequests[0], id: 'request-2', user_id: 'user-4' },
      ];

      mockFriendsApi.declineRequest.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ requests: multipleRequests });

      await act(async () => {
        await result.current.declineRequest('user-3');
      });

      expect(result.current.requests).toHaveLength(1);
      expect(result.current.requests[0].user_id).toBe('user-4');
    });

    it('should handle decline error', async () => {
      const error = new Error('Decline failed');
      mockFriendsApi.declineRequest.mockRejectedValue(error);
      mockFriendsApi.getRequests.mockResolvedValue(mockRequests);

      const { result } = renderHook(() => useFriendsStore());

      // Set up requests so the store can find the request ID
      useFriendsStore.setState({ requests: mockRequests });

      try {
        await act(async () => {
          await result.current.declineRequest('user-3');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Decline failed');
      });
    });
  });

  describe('removeFriend', () => {
    it('should remove friend successfully', async () => {
      mockFriendsApi.removeFriend.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ friends: mockFriends });

      await act(async () => {
        await result.current.removeFriend('user-1');
      });

      expect(mockFriendsApi.removeFriend).toHaveBeenCalledWith('user-1');
      expect(result.current.friends).toHaveLength(1);
      expect(result.current.friends[0].user_id).toBe('user-2');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should remove all friends from list if only one exists', async () => {
      mockFriendsApi.removeFriend.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ friends: [mockFriends[0]] });

      await act(async () => {
        await result.current.removeFriend('user-1');
      });

      expect(result.current.friends).toEqual([]);
    });

    it('should handle remove friend error', async () => {
      const error = new Error('Remove failed');
      mockFriendsApi.removeFriend.mockRejectedValue(error);

      const { result } = renderHook(() => useFriendsStore());

      try {
        await act(async () => {
          await result.current.removeFriend('user-1');
        });
      } catch (e) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Remove failed');
      });
    });

    it('should set loading state during remove', async () => {
      mockFriendsApi.removeFriend.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      const { result } = renderHook(() => useFriendsStore());

      useFriendsStore.setState({ friends: mockFriends });

      act(() => {
        result.current.removeFriend('user-1');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});

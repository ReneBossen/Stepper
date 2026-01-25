import { apiClient } from './client';
import { Friend } from '@store/friendsStore';

/**
 * Backend response types (camelCase from .NET API)
 */

/** Response for a single friend from the backend */
interface BackendFriendResponse {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  friendsSince: string;
  todaySteps?: number;
}

/** Response for the friends list endpoint */
interface BackendFriendListResponse {
  friends: BackendFriendResponse[];
  totalCount: number;
}

/** Response for a friend request from the backend */
interface BackendFriendRequestResponse {
  id: string;
  requesterId: string;
  requesterDisplayName: string;
  requesterAvatarUrl?: string;
  addresseeId?: string;
  addresseeDisplayName?: string;
  addresseeAvatarUrl?: string;
  status: string;
  createdAt: string;
}

/** Response for user search from the backend */
interface BackendUserSearchResult {
  id: string;
  displayName: string;
  avatarUrl?: string;
  friendshipStatus: string;
}

/** Response for search users endpoint */
interface BackendSearchUsersResponse {
  users: BackendUserSearchResult[];
  totalCount: number;
}

/**
 * Mobile types (snake_case for mobile consistency)
 */

export interface UserSearchResult {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  friendship_status?: string;
}

export interface OutgoingRequest {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export interface IncomingRequest {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

/**
 * Mapping functions to convert backend responses to mobile types
 */

function mapBackendFriendToMobile(friend: BackendFriendResponse): Friend {
  return {
    id: friend.userId, // Use userId as the friend's identifier
    user_id: friend.userId,
    display_name: friend.displayName,
    username: friend.displayName, // username not available, fallback to displayName
    avatar_url: friend.avatarUrl,
    today_steps: friend.todaySteps ?? 0,
    status: 'accepted' as const,
  };
}

function mapBackendIncomingRequestToMobile(request: BackendFriendRequestResponse): Friend {
  return {
    id: request.id,
    user_id: request.requesterId,
    display_name: request.requesterDisplayName,
    username: request.requesterDisplayName, // username not available, fallback to displayName
    avatar_url: request.requesterAvatarUrl,
    status: 'pending' as const,
  };
}

function mapBackendOutgoingRequestToMobile(request: BackendFriendRequestResponse): OutgoingRequest {
  return {
    id: request.id,
    user_id: request.addresseeId ?? '',
    display_name: request.addresseeDisplayName ?? 'Unknown',
    username: request.addresseeDisplayName ?? '', // username not available, fallback to displayName
    avatar_url: request.addresseeAvatarUrl,
    created_at: request.createdAt,
  };
}

function mapBackendSearchResultToMobile(result: BackendUserSearchResult): UserSearchResult {
  return {
    id: result.id,
    display_name: result.displayName,
    username: result.displayName, // username not available, fallback to displayName
    avatar_url: result.avatarUrl,
    friendship_status: result.friendshipStatus,
  };
}

/**
 * Friends API client using the backend .NET API.
 * All methods use apiClient which handles authentication automatically.
 */
export const friendsApi = {
  /**
   * Get all accepted friends for the current user.
   * The backend always includes today's step count.
   */
  getFriends: async (): Promise<Friend[]> => {
    const response = await apiClient.get<BackendFriendListResponse>('/friends');
    return response.friends.map(mapBackendFriendToMobile);
  },

  /**
   * Get all accepted friends with their today's step count.
   * Note: Backend always includes steps, so this is the same as getFriends.
   */
  getFriendsWithSteps: async (): Promise<Friend[]> => {
    const response = await apiClient.get<BackendFriendListResponse>('/friends');
    return response.friends.map(mapBackendFriendToMobile);
  },

  /**
   * Get pending incoming friend requests (where current user is the recipient).
   * Returns the requester's information.
   */
  getIncomingRequests: async (): Promise<Friend[]> => {
    const requests = await apiClient.get<BackendFriendRequestResponse[]>('/friends/requests/incoming');
    return requests.map(mapBackendIncomingRequestToMobile);
  },

  /**
   * Alias for getIncomingRequests for backward compatibility.
   */
  getRequests: async (): Promise<Friend[]> => {
    return friendsApi.getIncomingRequests();
  },

  /**
   * Get pending outgoing friend requests (where current user is the sender).
   */
  getOutgoingRequests: async (): Promise<OutgoingRequest[]> => {
    const requests = await apiClient.get<BackendFriendRequestResponse[]>('/friends/requests/outgoing');
    return requests.map(mapBackendOutgoingRequestToMobile);
  },

  /**
   * Send a friend request to another user.
   * @param userId - The ID of the user to send a request to
   */
  sendRequest: async (userId: string): Promise<void> => {
    await apiClient.post('/friends/requests', { friendUserId: userId });
  },

  /**
   * Accept a pending friend request.
   * @param requestId - The ID of the friend request to accept
   */
  acceptRequest: async (requestId: string): Promise<void> => {
    await apiClient.post(`/friends/requests/${requestId}/accept`);
  },

  /**
   * Decline (reject) a pending friend request.
   * @param requestId - The ID of the friend request to reject
   */
  declineRequest: async (requestId: string): Promise<void> => {
    await apiClient.post(`/friends/requests/${requestId}/reject`);
  },

  /**
   * Cancel an outgoing friend request.
   * @param requestId - The ID of the friend request to cancel
   */
  cancelRequest: async (requestId: string): Promise<void> => {
    await apiClient.delete(`/friends/requests/${requestId}`);
  },

  /**
   * Remove an existing friend.
   * @param friendId - The user ID of the friend to remove
   */
  removeFriend: async (friendId: string): Promise<void> => {
    await apiClient.delete(`/friends/${friendId}`);
  },

  /**
   * Search for users by display name.
   * Results exclude the current user and include friendship status.
   * @param query - The search query string
   */
  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    if (!query.trim()) return [];

    const encodedQuery = encodeURIComponent(query);
    const response = await apiClient.get<BackendSearchUsersResponse>(
      `/friends/discovery/search?query=${encodedQuery}`
    );
    return response.users.map(mapBackendSearchResultToMobile);
  },

  /**
   * Get a user by their ID (for QR code scanning).
   * @param userId - The user ID to look up
   */
  getUserById: async (userId: string): Promise<UserSearchResult | null> => {
    try {
      const result = await apiClient.get<BackendUserSearchResult>(
        `/friends/discovery/qr-code/${userId}`
      );
      return mapBackendSearchResultToMobile(result);
    } catch (error) {
      // Return null if user not found
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Check if a friendship or pending request already exists with a user.
   * Note: This information is now included in search results via friendshipStatus.
   * This method performs a search and checks the status.
   * @param targetUserId - The user ID to check friendship status with
   */
  checkFriendshipStatus: async (targetUserId: string): Promise<'none' | 'pending_sent' | 'pending_received' | 'accepted'> => {
    try {
      // Use QR code endpoint to get user with friendship status
      const result = await apiClient.get<BackendUserSearchResult>(
        `/friends/discovery/qr-code/${targetUserId}`
      );

      // Map backend status to mobile status format
      const statusMap: Record<string, 'none' | 'pending_sent' | 'pending_received' | 'accepted'> = {
        'none': 'none',
        'pending_sent': 'pending_sent',
        'pending_outgoing': 'pending_sent',
        'pending_received': 'pending_received',
        'pending_incoming': 'pending_received',
        'accepted': 'accepted',
        'friends': 'accepted',
      };

      return statusMap[result.friendshipStatus] || 'none';
    } catch {
      return 'none';
    }
  },
};

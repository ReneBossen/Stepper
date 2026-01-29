import { groupsApi } from '../groupsApi';
import { apiClient } from '../client';
import { supabase } from '@services/supabase';
import { Group, GroupMember, CreateGroupData, GroupWithLeaderboard, LeaderboardEntry } from '@store/groupsStore';

// Mock the apiClient
jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock supabase for real-time subscription (which still uses Supabase)
jest.mock('@services/supabase', () => ({
  supabase: {
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    removeChannel: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('groupsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyGroups', () => {
    it('should fetch user groups with leaderboard preview', async () => {
      const mockGroupsResponse = {
        groups: [
          {
            id: 'group-1',
            name: 'Morning Walkers',
            description: 'Early bird group',
            isPublic: true,
            periodType: 'Weekly',
            memberCount: 15,
            joinCode: 'ABC123',
            role: 'Owner',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const mockLeaderboardResponse = {
        groupId: 'group-1',
        periodStart: '2024-01-15T00:00:00Z',
        periodEnd: '2024-01-21T23:59:59Z',
        entries: [
          {
            rank: 1,
            userId: 'user-1',
            displayName: 'John Doe',
            avatarUrl: 'https://example.com/avatar.jpg',
            totalSteps: 50000,
            totalDistanceMeters: 40000,
          },
        ],
      };

      mockApiClient.get
        .mockResolvedValueOnce(mockGroupsResponse)
        .mockResolvedValueOnce(mockLeaderboardResponse);

      const result = await groupsApi.getMyGroups();

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups');
      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/group-1/leaderboard');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('group-1');
      expect(result[0].name).toBe('Morning Walkers');
      expect(result[0].user_role).toBe('owner');
      expect(result[0].is_private).toBe(false);
      expect(result[0].leaderboard_preview).toHaveLength(1);
    });

    it('should handle empty groups list', async () => {
      mockApiClient.get.mockResolvedValueOnce({ groups: [] });

      const result = await groupsApi.getMyGroups();

      expect(result).toEqual([]);
    });

    it('should handle leaderboard fetch failure gracefully', async () => {
      const mockGroupsResponse = {
        groups: [
          {
            id: 'group-1',
            name: 'Test Group',
            isPublic: true,
            periodType: 'Weekly',
            memberCount: 5,
            role: 'Member',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      // First call succeeds, second (leaderboard) fails
      mockApiClient.get
        .mockResolvedValueOnce(mockGroupsResponse)
        .mockRejectedValueOnce(new Error('Leaderboard unavailable'));

      const result = await groupsApi.getMyGroups();

      expect(result).toHaveLength(1);
      expect(result[0].leaderboard_preview).toEqual([]);
    });
  });

  describe('getGroups', () => {
    it('should fetch public groups via search', async () => {
      const mockSearchResponse = [
        {
          id: 'group-1',
          name: 'Public Group',
          description: 'A public group',
          memberCount: 10,
          isPublic: true,
        },
      ];

      mockApiClient.get.mockResolvedValueOnce(mockSearchResponse);

      const result = await groupsApi.getGroups();

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/search?query=');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Public Group');
      expect(result[0].is_private).toBe(false);
    });
  });

  describe('getGroup', () => {
    it('should fetch single group with details', async () => {
      const mockGroupResponse = {
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        isPublic: false,
        periodType: 'Daily',
        memberCount: 5,
        joinCode: 'XYZ789',
        role: 'Admin',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const mockLeaderboardResponse = {
        groupId: 'group-1',
        periodStart: '2024-01-15T00:00:00Z',
        periodEnd: '2024-01-15T23:59:59Z',
        entries: [],
      };

      mockApiClient.get
        .mockResolvedValueOnce(mockGroupResponse)
        .mockResolvedValueOnce(mockLeaderboardResponse);

      const result = await groupsApi.getGroup('group-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/group-1');
      expect(result.id).toBe('group-1');
      expect(result.user_role).toBe('admin');
      expect(result.is_private).toBe(true);
      expect(result.competition_type).toBe('daily');
    });

    it('should calculate period dates locally if leaderboard fails', async () => {
      const mockGroupResponse = {
        id: 'group-1',
        name: 'Test Group',
        isPublic: true,
        periodType: 'Weekly',
        memberCount: 5,
        role: 'Member',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockApiClient.get
        .mockResolvedValueOnce(mockGroupResponse)
        .mockRejectedValueOnce(new Error('Leaderboard unavailable'));

      const result = await groupsApi.getGroup('group-1');

      expect(result.period_start).toBeTruthy();
      expect(result.period_end).toBeTruthy();
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch and map leaderboard entries', async () => {
      const mockLeaderboardResponse = {
        groupId: 'group-1',
        periodStart: '2024-01-15T00:00:00Z',
        periodEnd: '2024-01-21T23:59:59Z',
        entries: [
          {
            rank: 1,
            userId: 'user-1',
            displayName: 'Top Walker',
            avatarUrl: 'https://example.com/avatar.jpg',
            totalSteps: 100000,
            totalDistanceMeters: 80000,
          },
          {
            rank: 2,
            userId: 'user-2',
            displayName: 'Second Place',
            avatarUrl: null,
            totalSteps: 80000,
            totalDistanceMeters: 64000,
          },
        ],
      };

      mockApiClient.get.mockResolvedValueOnce(mockLeaderboardResponse);

      const result = await groupsApi.getLeaderboard('group-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/group-1/leaderboard');
      expect(result).toHaveLength(2);
      expect(result[0].steps).toBe(100000);
      expect(result[0].rank).toBe(1);
      expect(result[1].steps).toBe(80000);
      expect(result[1].rank).toBe(2);
    });

    it('should handle empty leaderboard', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        groupId: 'group-1',
        periodStart: '2024-01-15T00:00:00Z',
        periodEnd: '2024-01-21T23:59:59Z',
        entries: [],
      });

      const result = await groupsApi.getLeaderboard('group-1');

      expect(result).toEqual([]);
    });
  });

  describe('getMembers', () => {
    it('should fetch and map group members', async () => {
      const mockMembersResponse = [
        {
          userId: 'user-1',
          displayName: 'John Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
          role: 'Owner',
          joinedAt: '2024-01-01T00:00:00Z',
        },
        {
          userId: 'user-2',
          displayName: 'Jane Smith',
          avatarUrl: null,
          role: 'Member',
          joinedAt: '2024-01-05T00:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValueOnce(mockMembersResponse);

      const result = await groupsApi.getMembers('group-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/group-1/members');
      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe('user-1');
      expect(result[0].role).toBe('owner');
      expect(result[1].role).toBe('member');
    });
  });

  describe('createGroup', () => {
    it('should create group with correct request format', async () => {
      const createData: CreateGroupData = {
        name: 'New Group',
        description: 'Test description',
        competition_type: 'weekly',
        is_private: true,
      };

      const mockResponse = {
        id: 'new-group-id',
        name: 'New Group',
        description: 'Test description',
        isPublic: false,
        periodType: 'Weekly',
        memberCount: 1,
        joinCode: 'ABC123',
        role: 'Owner',
        createdAt: '2024-01-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await groupsApi.createGroup(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/groups', {
        name: 'New Group',
        description: 'Test description',
        isPublic: false,
        periodType: 'Weekly',
      });
      expect(result.id).toBe('new-group-id');
      expect(result.is_private).toBe(true);
    });

    it('should handle public group creation', async () => {
      const createData: CreateGroupData = {
        name: 'Public Group',
        competition_type: 'daily',
        is_private: false,
      };

      const mockResponse = {
        id: 'new-group-id',
        name: 'Public Group',
        isPublic: true,
        periodType: 'Daily',
        memberCount: 1,
        role: 'Owner',
        createdAt: '2024-01-15T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await groupsApi.createGroup(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/groups', {
        name: 'Public Group',
        description: undefined,
        isPublic: true,
        periodType: 'Daily',
      });
    });
  });

  describe('joinGroup', () => {
    it('should join group successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({});

      await groupsApi.joinGroup('group-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/groups/group-1/join', { joinCode: undefined });
    });

    it('should join group with join code', async () => {
      mockApiClient.post.mockResolvedValueOnce({});

      await groupsApi.joinGroup('group-1', 'SECRET');

      expect(mockApiClient.post).toHaveBeenCalledWith('/groups/group-1/join', { joinCode: 'SECRET' });
    });
  });

  describe('joinGroupByCode', () => {
    it('should join group by code and return group ID', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        id: 'joined-group-id',
        name: 'Joined Group',
        isPublic: false,
        periodType: 'Weekly',
        memberCount: 10,
        role: 'Member',
        createdAt: '2024-01-01T00:00:00Z',
      });

      const result = await groupsApi.joinGroupByCode('abc123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/groups/join-by-code', {
        code: 'ABC123', // Should be uppercased
      });
      expect(result).toBe('joined-group-id');
    });
  });

  describe('leaveGroup', () => {
    it('should leave group successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({});

      await groupsApi.leaveGroup('group-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/groups/group-1/leave');
    });
  });

  describe('searchPublicGroups', () => {
    it('should search public groups', async () => {
      const mockSearchResponse = [
        {
          id: 'group-1',
          name: 'Walking Club',
          description: 'A walking group',
          memberCount: 25,
          isPublic: true,
        },
      ];

      mockApiClient.get.mockResolvedValueOnce(mockSearchResponse);

      const result = await groupsApi.searchPublicGroups('walking');

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/search?query=walking&limit=20');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Walking Club');
    });

    it('should return empty array for empty query', async () => {
      const result = await groupsApi.searchPublicGroups('');

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace query', async () => {
      const result = await groupsApi.searchPublicGroups('   ');

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should encode query parameters', async () => {
      mockApiClient.get.mockResolvedValueOnce([]);

      await groupsApi.searchPublicGroups('test group');

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/search?query=test%20group&limit=20');
    });
  });

  describe('updateGroup', () => {
    it('should update group with partial data', async () => {
      const currentGroup = {
        id: 'group-1',
        name: 'Original Name',
        description: 'Original description',
        isPublic: true,
        periodType: 'Weekly',
        memberCount: 5,
        role: 'Owner',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockApiClient.get.mockResolvedValueOnce(currentGroup);
      mockApiClient.put.mockResolvedValueOnce({});

      await groupsApi.updateGroup('group-1', { name: 'New Name' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/group-1');
      expect(mockApiClient.put).toHaveBeenCalledWith('/groups/group-1', {
        name: 'New Name',
        description: 'Original description',
        isPublic: true,
      });
    });

    it('should toggle privacy setting', async () => {
      const currentGroup = {
        id: 'group-1',
        name: 'Test Group',
        description: 'Test',
        isPublic: true,
        periodType: 'Weekly',
        memberCount: 5,
        role: 'Owner',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockApiClient.get.mockResolvedValueOnce(currentGroup);
      mockApiClient.put.mockResolvedValueOnce({});

      await groupsApi.updateGroup('group-1', { is_private: true });

      expect(mockApiClient.put).toHaveBeenCalledWith('/groups/group-1', {
        name: 'Test Group',
        description: 'Test',
        isPublic: false,
      });
    });
  });

  describe('deleteGroup', () => {
    it('should delete group successfully', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});

      await groupsApi.deleteGroup('group-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/groups/group-1');
    });
  });

  describe('promoteMember', () => {
    it('should promote member to admin', async () => {
      mockApiClient.put.mockResolvedValueOnce({});

      await groupsApi.promoteMember('group-1', 'user-1');

      expect(mockApiClient.put).toHaveBeenCalledWith('/groups/group-1/members/user-1', {
        role: 'Admin',
      });
    });
  });

  describe('demoteMember', () => {
    it('should demote admin to member', async () => {
      mockApiClient.put.mockResolvedValueOnce({});

      await groupsApi.demoteMember('group-1', 'user-1');

      expect(mockApiClient.put).toHaveBeenCalledWith('/groups/group-1/members/user-1', {
        role: 'Member',
      });
    });
  });

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});

      await groupsApi.removeMember('group-1', 'user-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/groups/group-1/members/user-1');
    });
  });

  describe('getPendingMembers', () => {
    it('should fetch pending members', async () => {
      const mockPendingResponse = [
        {
          userId: 'user-1',
          displayName: 'Pending User',
          avatarUrl: null,
          role: 'Member',
          joinedAt: '2024-01-15T00:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValueOnce(mockPendingResponse);

      const result = await groupsApi.getPendingMembers('group-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/group-1/members?status=pending');
      expect(result).toHaveLength(1);
      expect(result[0].display_name).toBe('Pending User');
    });
  });

  describe('approveMember', () => {
    it('should approve pending member', async () => {
      mockApiClient.post.mockResolvedValueOnce({});

      await groupsApi.approveMember('group-1', 'user-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/groups/group-1/members/user-1/approve');
    });
  });

  describe('denyMember', () => {
    it('should deny pending member', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});

      await groupsApi.denyMember('group-1', 'user-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/groups/group-1/members/user-1');
    });
  });

  describe('getInviteCode', () => {
    it('should fetch invite code from group details', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        id: 'group-1',
        name: 'Test Group',
        isPublic: false,
        periodType: 'Weekly',
        memberCount: 5,
        joinCode: 'SECRET123',
        role: 'Owner',
        createdAt: '2024-01-01T00:00:00Z',
      });

      const result = await groupsApi.getInviteCode('group-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/group-1');
      expect(result).toBe('SECRET123');
    });

    it('should return null if no invite code', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        id: 'group-1',
        name: 'Public Group',
        isPublic: true,
        periodType: 'Weekly',
        memberCount: 5,
        role: 'Owner',
        createdAt: '2024-01-01T00:00:00Z',
      });

      const result = await groupsApi.getInviteCode('group-1');

      expect(result).toBeNull();
    });
  });

  describe('generateInviteCode', () => {
    it('should generate new invite code', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        id: 'group-1',
        name: 'Test Group',
        isPublic: false,
        periodType: 'Weekly',
        memberCount: 5,
        joinCode: 'NEWCODE',
        role: 'Owner',
        createdAt: '2024-01-01T00:00:00Z',
      });

      const result = await groupsApi.generateInviteCode('group-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/groups/group-1/regenerate-code');
      expect(result).toBe('NEWCODE');
    });
  });

  describe('inviteFriends', () => {
    it('should invite multiple friends', async () => {
      mockApiClient.post
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await groupsApi.inviteFriends('group-1', ['friend-1', 'friend-2', 'friend-3']);

      expect(mockApiClient.post).toHaveBeenCalledTimes(3);
      expect(mockApiClient.post).toHaveBeenCalledWith('/groups/group-1/members', { userId: 'friend-1' });
      expect(mockApiClient.post).toHaveBeenCalledWith('/groups/group-1/members', { userId: 'friend-2' });
      expect(mockApiClient.post).toHaveBeenCalledWith('/groups/group-1/members', { userId: 'friend-3' });
    });

    it('should handle empty friends list', async () => {
      await groupsApi.inviteFriends('group-1', []);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('getGroupDetails', () => {
    it('should fetch group management details', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        isPublic: false,
        periodType: 'Monthly',
        memberCount: 10,
        joinCode: 'ABC123',
        role: 'Owner',
        createdAt: '2024-01-01T00:00:00Z',
      });

      const result = await groupsApi.getGroupDetails('group-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/groups/group-1');
      expect(result.id).toBe('group-1');
      expect(result.competition_type).toBe('monthly');
      expect(result.is_private).toBe(true);
      expect(result.join_code).toBe('ABC123');
      expect(result.user_role).toBe('owner');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role to admin', async () => {
      mockApiClient.put.mockResolvedValueOnce({});

      await groupsApi.updateMemberRole('group-1', 'user-1', 'admin');

      expect(mockApiClient.put).toHaveBeenCalledWith('/groups/group-1/members/user-1', {
        role: 'Admin',
      });
    });

    it('should update member role to member', async () => {
      mockApiClient.put.mockResolvedValueOnce({});

      await groupsApi.updateMemberRole('group-1', 'user-1', 'member');

      expect(mockApiClient.put).toHaveBeenCalledWith('/groups/group-1/members/user-1', {
        role: 'Member',
      });
    });
  });

  describe('subscribeToLeaderboard', () => {
    it('should subscribe to leaderboard changes using Supabase', () => {
      const callback = jest.fn();
      const mockChannel = supabase.channel as jest.Mock;
      const mockRemoveChannel = supabase.removeChannel as jest.Mock;

      const unsubscribe = groupsApi.subscribeToLeaderboard('group-1', callback);

      expect(mockChannel).toHaveBeenCalledWith('group-group-1-leaderboard');

      // Test unsubscribe function
      unsubscribe();
      expect(mockRemoveChannel).toHaveBeenCalled();
    });
  });
});

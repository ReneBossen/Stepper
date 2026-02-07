import { supabase } from '../supabase';
import { apiClient } from './client';
import { Group, GroupMember, CreateGroupData, GroupWithLeaderboard, LeaderboardEntry, GroupManagementDetail, GroupDetail } from '@store/groupsStore';

/**
 * Backend API response types (camelCase from .NET backend)
 */
interface GroupResponse {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  periodType: 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
  memberCount: number;
  maxMembers: number;
  joinCode?: string;
  role: 'Owner' | 'Admin' | 'Member';
  createdAt: string;
}

interface GroupListResponse {
  groups: GroupResponse[];
}

interface GroupSearchResponse {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  maxMembers: number;
  isPublic: boolean;
}

interface GroupMemberResponse {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: 'Owner' | 'Admin' | 'Member';
  joinedAt: string;
}

interface LeaderboardEntryResponse {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  totalSteps: number;
  totalDistanceMeters: number;
}

interface LeaderboardResponse {
  groupId: string;
  periodStart: string;
  periodEnd: string;
  entries: LeaderboardEntryResponse[];
}

/**
 * Convert backend role to frontend role format (lowercase)
 */
function mapRole(role: 'Owner' | 'Admin' | 'Member'): 'owner' | 'admin' | 'member' {
  return role.toLowerCase() as 'owner' | 'admin' | 'member';
}

/**
 * Convert backend period type to frontend format (lowercase)
 */
function mapPeriodType(periodType: 'Daily' | 'Weekly' | 'Monthly' | 'Custom'): 'daily' | 'weekly' | 'monthly' {
  const mapped = periodType.toLowerCase();
  if (mapped === 'custom') return 'weekly'; // Default custom to weekly
  return mapped as 'daily' | 'weekly' | 'monthly';
}

/**
 * Format date range for display.
 */
function formatPeriodDates(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (startDate.split('T')[0] === endDate.split('T')[0]) {
    return start.toLocaleDateString('en-US', { ...options, year: 'numeric' });
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

/**
 * Convert GroupResponse from backend to Group for frontend
 */
function mapGroupResponseToGroup(response: GroupResponse): Group {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    competition_type: mapPeriodType(response.periodType),
    is_private: !response.isPublic,
    member_count: response.memberCount,
    max_members: response.maxMembers,
    created_at: response.createdAt,
  };
}

/**
 * Convert GroupSearchResponse from backend to Group for frontend
 */
function mapSearchResponseToGroup(response: GroupSearchResponse): Group {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    competition_type: 'weekly', // Default, not included in search response
    is_private: !response.isPublic,
    member_count: response.memberCount,
    max_members: response.maxMembers,
    created_at: '', // Not included in search response
  };
}

/**
 * Convert GroupMemberResponse from backend to GroupMember for frontend
 */
function mapMemberResponseToMember(response: GroupMemberResponse, index: number): GroupMember {
  return {
    user_id: response.userId,
    display_name: response.displayName,
    username: response.displayName, // Use display_name as username fallback
    avatar_url: response.avatarUrl,
    role: mapRole(response.role),
    joined_at: response.joinedAt,
    steps: 0, // Will be populated from leaderboard if needed
    rank: index + 1, // Default rank based on position
  };
}

export const groupsApi = {
  /**
   * Get all groups the current user is a member of with leaderboard preview.
   * Uses backend API: GET /api/v1/groups
   */
  getMyGroups: async (): Promise<GroupWithLeaderboard[]> => {
    const response = await apiClient.get<GroupListResponse>('/groups');

    // For each group, fetch leaderboard to get preview
    const groupsWithLeaderboard: GroupWithLeaderboard[] = await Promise.all(
      response.groups.map(async (group) => {
        // Get leaderboard for preview
        let leaderboardPreview: LeaderboardEntry[] = [];
        let periodStart = '';
        let periodEnd = '';
        let currentUserRank: number | undefined;
        let currentUserSteps: number | undefined;

        try {
          const leaderboardResponse = await apiClient.get<LeaderboardResponse>(`/groups/${group.id}/leaderboard`);
          periodStart = leaderboardResponse.periodStart;
          periodEnd = leaderboardResponse.periodEnd;

          leaderboardPreview = leaderboardResponse.entries.slice(0, 3).map((entry) => ({
            user_id: entry.userId,
            display_name: entry.displayName,
            avatar_url: entry.avatarUrl,
            steps: entry.totalSteps,
            rank: entry.rank,
            rank_change: 0, // Backend doesn't provide rank change yet
            is_current_user: false, // Will be set below
          }));

          // Find current user in full leaderboard
          // We need to check if any entry matches current user
          // Since we don't have user ID here, we'll mark based on role being owner/admin/member
          // The frontend store will handle the is_current_user flag based on auth context
        } catch {
          // If leaderboard fetch fails, continue with empty preview
          if (__DEV__) console.warn(`Failed to fetch leaderboard for group ${group.id}`);
        }

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          competition_type: mapPeriodType(group.periodType),
          is_private: !group.isPublic,
          member_count: group.memberCount,
          max_members: group.maxMembers,
          created_at: group.createdAt,
          created_by_id: undefined, // Not provided by list endpoint
          join_code: group.joinCode,
          user_role: mapRole(group.role),
          period_start: periodStart,
          period_end: periodEnd,
          period_display: periodStart && periodEnd ? formatPeriodDates(periodStart, periodEnd) : '',
          leaderboard_preview: leaderboardPreview,
          current_user_rank: currentUserRank,
          current_user_steps: currentUserSteps,
        };
      })
    );

    return groupsWithLeaderboard;
  },

  /**
   * Get all groups (for browsing public groups).
   * @deprecated Use searchPublicGroups instead
   */
  getGroups: async (): Promise<Group[]> => {
    // Search with empty query to get all public groups
    const response = await apiClient.get<GroupSearchResponse[]>('/groups/search?query=');
    return response.map(mapSearchResponseToGroup);
  },

  /**
   * Get a single group with full details.
   * Uses backend API: GET /api/v1/groups/{id}
   */
  getGroup: async (groupId: string): Promise<GroupDetail> => {
    const response = await apiClient.get<GroupResponse>(`/groups/${groupId}`);

    // Fetch leaderboard to get period dates
    let periodStart = '';
    let periodEnd = '';

    try {
      const leaderboardResponse = await apiClient.get<LeaderboardResponse>(`/groups/${groupId}/leaderboard`);
      periodStart = leaderboardResponse.periodStart;
      periodEnd = leaderboardResponse.periodEnd;
    } catch {
      // Calculate period dates locally if leaderboard fails
      const { startDate, endDate } = getCompetitionPeriodDates(mapPeriodType(response.periodType));
      periodStart = startDate;
      periodEnd = endDate;
    }

    return {
      id: response.id,
      name: response.name,
      description: response.description,
      competition_type: mapPeriodType(response.periodType),
      is_private: !response.isPublic,
      member_count: response.memberCount,
      max_members: response.maxMembers,
      created_at: response.createdAt,
      user_role: mapRole(response.role),
      join_code: response.joinCode,
      period_start: periodStart,
      period_end: periodEnd,
      period_display: formatPeriodDates(periodStart, periodEnd),
    };
  },

  /**
   * Get full leaderboard for a group.
   * Uses backend API: GET /api/v1/groups/{id}/leaderboard
   */
  getLeaderboard: async (groupId: string): Promise<LeaderboardEntry[]> => {
    const response = await apiClient.get<LeaderboardResponse>(`/groups/${groupId}/leaderboard`);

    return response.entries.map((entry) => ({
      user_id: entry.userId,
      display_name: entry.displayName,
      avatar_url: entry.avatarUrl,
      steps: entry.totalSteps,
      rank: entry.rank,
      rank_change: 0, // Backend doesn't provide rank change yet
      is_current_user: false, // Frontend will set based on auth context
    }));
  },

  /**
   * Get group members with their roles.
   * Uses backend API: GET /api/v1/groups/{id}/members
   */
  getMembers: async (groupId: string): Promise<GroupMember[]> => {
    const response = await apiClient.get<GroupMemberResponse[]>(`/groups/${groupId}/members`);
    return response.map(mapMemberResponseToMember);
  },

  /**
   * Create a new group.
   * Uses backend API: POST /api/v1/groups
   */
  createGroup: async (data: CreateGroupData): Promise<Group> => {
    const request = {
      name: data.name,
      description: data.description,
      isPublic: !data.is_private,
      periodType: data.competition_type.charAt(0).toUpperCase() + data.competition_type.slice(1),
      maxMembers: data.max_members ?? 5,
    };

    const response = await apiClient.post<GroupResponse>('/groups', request);
    return mapGroupResponseToGroup(response);
  },

  /**
   * Join a group (public or with join code).
   * Uses backend API: POST /api/v1/groups/{id}/join
   */
  joinGroup: async (groupId: string, joinCode?: string): Promise<void> => {
    await apiClient.post<GroupResponse>(`/groups/${groupId}/join`, { joinCode });
  },

  /**
   * Join a group by join code.
   * Uses backend API: POST /api/v1/groups/join-by-code
   */
  joinGroupByCode: async (joinCode: string): Promise<string> => {
    const response = await apiClient.post<GroupResponse>('/groups/join-by-code', {
      code: joinCode.toUpperCase(),
    });
    return response.id;
  },

  /**
   * Leave a group.
   * Uses backend API: POST /api/v1/groups/{id}/leave
   */
  leaveGroup: async (groupId: string): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/leave`);
  },

  /**
   * Subscribe to leaderboard changes for a group.
   * NOTE: This uses Supabase real-time subscriptions directly (allowed per requirements).
   */
  subscribeToLeaderboard: (groupId: string, callback: () => void) => {
    const channel = supabase
      .channel(`group-${groupId}-leaderboard`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'step_entries',
        },
        () => {
          // Refresh leaderboard when step entries change
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Search public groups by name.
   * Uses backend API: GET /api/v1/groups/search?query=...
   */
  searchPublicGroups: async (query: string): Promise<Group[]> => {
    if (!query.trim()) return [];

    const response = await apiClient.get<GroupSearchResponse[]>(
      `/groups/search?query=${encodeURIComponent(query)}&limit=20`
    );

    return response.map(mapSearchResponseToGroup);
  },

  /**
   * Get public groups (featured/popular).
   * Uses backend API: GET /api/v1/groups/public?limit=...
   */
  getPublicGroups: async (limit: number = 10): Promise<Group[]> => {
    const response = await apiClient.get<GroupSearchResponse[]>(
      `/groups/public?limit=${limit}`
    );
    return response.map(mapSearchResponseToGroup);
  },

  /**
   * Update group details.
   * Uses backend API: PUT /api/v1/groups/{id}
   */
  updateGroup: async (groupId: string, data: { name?: string; description?: string; is_private?: boolean; require_approval?: boolean; max_members?: number }): Promise<void> => {
    // Get current group to fill in required fields
    const currentGroup = await apiClient.get<GroupResponse>(`/groups/${groupId}`);

    const request: Record<string, unknown> = {
      name: data.name ?? currentGroup.name,
      description: data.description ?? currentGroup.description,
      isPublic: data.is_private !== undefined ? !data.is_private : currentGroup.isPublic,
    };

    if (data.max_members !== undefined) {
      request.maxMembers = data.max_members;
    }

    await apiClient.put<GroupResponse>(`/groups/${groupId}`, request);
  },

  /**
   * Delete a group.
   * Uses backend API: DELETE /api/v1/groups/{id}
   */
  deleteGroup: async (groupId: string): Promise<void> => {
    await apiClient.delete(`/groups/${groupId}`);
  },

  /**
   * Promote a member to admin.
   * Uses backend API: PUT /api/v1/groups/{id}/members/{userId}
   */
  promoteMember: async (groupId: string, userId: string): Promise<void> => {
    await apiClient.put<GroupMemberResponse>(`/groups/${groupId}/members/${userId}`, {
      role: 'Admin',
    });
  },

  /**
   * Demote an admin to member.
   * Uses backend API: PUT /api/v1/groups/{id}/members/{userId}
   */
  demoteMember: async (groupId: string, userId: string): Promise<void> => {
    await apiClient.put<GroupMemberResponse>(`/groups/${groupId}/members/${userId}`, {
      role: 'Member',
    });
  },

  /**
   * Remove a member from the group.
   * Uses backend API: DELETE /api/v1/groups/{id}/members/{userId}
   */
  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/groups/${groupId}/members/${userId}`);
  },

  /**
   * Get pending join requests for a group.
   * Uses backend API: GET /api/v1/groups/{id}/members?status=pending
   */
  getPendingMembers: async (groupId: string): Promise<GroupMember[]> => {
    const response = await apiClient.get<GroupMemberResponse[]>(`/groups/${groupId}/members?status=pending`);
    return response.map(mapMemberResponseToMember);
  },

  /**
   * Approve a pending member request.
   * Uses backend API: POST /api/v1/groups/{id}/members/{userId}/approve
   */
  approveMember: async (groupId: string, userId: string): Promise<void> => {
    await apiClient.post<GroupMemberResponse>(`/groups/${groupId}/members/${userId}/approve`);
  },

  /**
   * Deny a pending member request.
   * Uses backend API: DELETE /api/v1/groups/{id}/members/{userId}
   */
  denyMember: async (groupId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/groups/${groupId}/members/${userId}`);
  },

  /**
   * Get the current invite code for a group.
   * Uses backend API: GET /api/v1/groups/{id} (join_code is in response)
   */
  getInviteCode: async (groupId: string): Promise<string | null> => {
    const response = await apiClient.get<GroupResponse>(`/groups/${groupId}`);
    return response.joinCode || null;
  },

  /**
   * Generate a new invite code for a group.
   * Uses backend API: POST /api/v1/groups/{id}/regenerate-code
   */
  generateInviteCode: async (groupId: string): Promise<string> => {
    const response = await apiClient.post<GroupResponse>(`/groups/${groupId}/regenerate-code`);
    return response.joinCode || '';
  },

  /**
   * Invite friends to a group.
   * Uses backend API: POST /api/v1/groups/{id}/members (for each friend)
   */
  inviteFriends: async (groupId: string, friendIds: string[]): Promise<void> => {
    // Invite each friend individually
    await Promise.all(
      friendIds.map((userId) =>
        apiClient.post<GroupMemberResponse>(`/groups/${groupId}/members`, { userId })
      )
    );
  },

  /**
   * Get full group details including require_approval setting.
   * Uses backend API: GET /api/v1/groups/{id}
   */
  getGroupDetails: async (groupId: string): Promise<GroupManagementDetail> => {
    const response = await apiClient.get<GroupResponse>(`/groups/${groupId}`);

    return {
      id: response.id,
      name: response.name,
      description: response.description,
      competition_type: mapPeriodType(response.periodType),
      is_private: !response.isPublic,
      require_approval: false, // Backend doesn't support this yet
      join_code: response.joinCode,
      created_by_id: '', // Not provided by backend yet
      member_count: response.memberCount,
      max_members: response.maxMembers ?? 5,
      user_role: mapRole(response.role),
    };
  },

  /**
   * Update a member's role in the group.
   * Uses backend API: PUT /api/v1/groups/{id}/members/{userId}
   */
  updateMemberRole: async (groupId: string, userId: string, role: 'admin' | 'member'): Promise<void> => {
    const backendRole = role.charAt(0).toUpperCase() + role.slice(1); // Capitalize first letter
    await apiClient.put<GroupMemberResponse>(`/groups/${groupId}/members/${userId}`, {
      role: backendRole,
    });
  },
};

/**
 * Calculate competition period dates based on period type.
 * Used as fallback when backend doesn't provide dates.
 */
function getCompetitionPeriodDates(periodType: string): { startDate: string; endDate: string } {
  const today = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (periodType) {
    case 'daily':
      startDate = today;
      endDate = today;
      break;
    case 'weekly':
      // Start of week (Monday)
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(today);
      startDate.setDate(today.getDate() - diffToMonday);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    case 'monthly':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    default:
      startDate = today;
      endDate = today;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

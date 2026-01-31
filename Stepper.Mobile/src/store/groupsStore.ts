import { create } from 'zustand';
import { groupsApi } from '@services/api/groupsApi';
import { getErrorMessage } from '@utils/errorUtils';
import { track, setUserProperties } from '@services/analytics';
import { evaluate, MilestoneContext } from '@services/milestones';
import { useAuthStore } from './authStore';

/**
 * Helper function to handle analytics tracking and milestone evaluation
 * when group count changes (create, join, join by code).
 *
 * @param previousCount - The previous number of groups the user was in
 * @param newGroups - The updated list of groups after the action
 * @param groupId - The ID of the group that was created/joined
 * @param eventName - The analytics event name to track
 * @param groupDetails - Additional group details for the event
 */
async function handleGroupCountChange(
  previousCount: number,
  newGroups: GroupWithLeaderboard[],
  groupId: string,
  eventName: 'group_created' | 'group_joined',
  groupDetails: {
    name?: string;
    is_public?: boolean;
    member_count?: number;
  }
): Promise<void> {
  // Track the event
  track(eventName, {
    group_id: groupId,
    group_name: groupDetails.name,
    is_public: groupDetails.is_public,
    member_count: groupDetails.member_count,
  });

  // Update user properties with new group count
  setUserProperties({ group_count: newGroups.length });

  // Evaluate milestones for group count changes
  const currentUser = useAuthStore.getState().user;
  if (currentUser) {
    const context: MilestoneContext = {
      currentMetrics: { group_count: newGroups.length },
      previousMetrics: { group_count: previousCount },
      userId: currentUser.id,
    };
    await evaluate(context);
  }
}

/**
 * Base group information.
 */
export interface Group {
  id: string;
  name: string;
  description?: string;
  competition_type: 'daily' | 'weekly' | 'monthly';
  is_private: boolean;
  member_count: number;
  max_members: number;
  created_at: string;
}

/**
 * Leaderboard entry for a group member.
 */
export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  steps: number;
  rank: number;
  rank_change: number;
  is_current_user: boolean;
}

/**
 * Group with leaderboard preview for the list screen.
 */
export interface GroupWithLeaderboard extends Group {
  created_by_id?: string;
  join_code?: string;
  user_role: 'owner' | 'admin' | 'member';
  period_start: string;
  period_end: string;
  period_display: string;
  leaderboard_preview: LeaderboardEntry[];
  current_user_rank?: number;
  current_user_steps?: number;
}

/**
 * Group member with details.
 */
export interface GroupMember {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  role?: 'owner' | 'admin' | 'member';
  joined_at?: string;
  steps: number;
  rank: number;
}

/**
 * Data required to create a new group.
 */
export interface CreateGroupData {
  name: string;
  description?: string;
  competition_type: 'daily' | 'weekly' | 'monthly';
  is_private: boolean;
  /** Maximum number of members allowed (default 5, range 1-50) */
  max_members?: number;
}

/**
 * Extended group details for the detail screen.
 */
export interface GroupDetail extends Group {
  user_role?: 'owner' | 'admin' | 'member';
  join_code?: string;
  period_start: string;
  period_end: string;
  period_display: string;
}

/**
 * Full group details for management screen.
 */
export interface GroupManagementDetail {
  id: string;
  name: string;
  description?: string;
  competition_type: 'daily' | 'weekly' | 'monthly';
  is_private: boolean;
  require_approval: boolean;
  join_code?: string;
  created_by_id: string;
  member_count: number;
  max_members: number;
  user_role?: 'owner' | 'admin' | 'member';
}

/**
 * Data for updating a group.
 */
export interface UpdateGroupData {
  name?: string;
  description?: string;
  is_private?: boolean;
  require_approval?: boolean;
  max_members?: number;
}

interface GroupsState {
  // List screen state
  myGroups: GroupWithLeaderboard[];
  isLoadingGroups: boolean;
  groupsError: string | null;

  // Detail screen state
  currentGroup: GroupDetail | null;
  leaderboard: LeaderboardEntry[];
  isLoadingDetail: boolean;
  detailError: string | null;

  // Management screen state
  managementGroup: GroupManagementDetail | null;
  members: GroupMember[];
  pendingMembers: GroupMember[];
  inviteCode: string | null;
  isLoadingManagement: boolean;
  managementError: string | null;

  // Search state
  publicGroups: Group[];
  isSearching: boolean;
  searchError: string | null;

  // Featured groups state
  featuredGroups: Group[];
  isLoadingFeatured: boolean;

  // Legacy support (deprecated, use myGroups instead)
  groups: Group[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMyGroups: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchGroup: (groupId: string) => Promise<void>;
  fetchLeaderboard: (groupId: string) => Promise<void>;
  createGroup: (data: CreateGroupData) => Promise<Group>;
  joinGroup: (groupId: string) => Promise<void>;
  joinGroupByCode: (code: string) => Promise<string>;
  leaveGroup: (groupId: string) => Promise<void>;
  clearCurrentGroup: () => void;

  // Management actions
  fetchGroupDetails: (groupId: string) => Promise<void>;
  searchPublicGroups: (query: string) => Promise<void>;
  fetchFeaturedGroups: () => Promise<void>;
  updateGroup: (groupId: string, data: UpdateGroupData) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  fetchMembers: (groupId: string) => Promise<void>;
  promoteMember: (groupId: string, userId: string) => Promise<void>;
  demoteMember: (groupId: string, userId: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  fetchPendingMembers: (groupId: string) => Promise<void>;
  approveMember: (groupId: string, userId: string) => Promise<void>;
  denyMember: (groupId: string, userId: string) => Promise<void>;
  fetchInviteCode: (groupId: string) => Promise<void>;
  generateInviteCode: (groupId: string) => Promise<void>;
  inviteFriends: (groupId: string, friendIds: string[]) => Promise<void>;
  clearManagementState: () => void;
  clearSearch: () => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  // List screen state
  myGroups: [],
  isLoadingGroups: false,
  groupsError: null,

  // Detail screen state
  currentGroup: null,
  leaderboard: [],
  isLoadingDetail: false,
  detailError: null,

  // Management screen state
  managementGroup: null,
  members: [],
  pendingMembers: [],
  inviteCode: null,
  isLoadingManagement: false,
  managementError: null,

  // Search state
  publicGroups: [],
  isSearching: false,
  searchError: null,

  // Featured groups state
  featuredGroups: [],
  isLoadingFeatured: false,

  // Legacy support
  groups: [],
  isLoading: false,
  error: null,

  /**
   * Fetch all groups the current user is a member of with leaderboard preview.
   */
  fetchMyGroups: async () => {
    set({ isLoadingGroups: true, groupsError: null });
    try {
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoadingGroups: false });
    } catch (error: unknown) {
      set({ groupsError: getErrorMessage(error), isLoadingGroups: false });
    }
  },

  /**
   * Fetch all available groups (public groups).
   * @deprecated Use fetchMyGroups for user's groups
   */
  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await groupsApi.getGroups();
      set({ groups, isLoading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  /**
   * Fetch a single group's details.
   */
  fetchGroup: async (groupId) => {
    set({ isLoadingDetail: true, detailError: null });
    try {
      const group = await groupsApi.getGroup(groupId);
      set({ currentGroup: group, isLoadingDetail: false });
    } catch (error: unknown) {
      set({ detailError: getErrorMessage(error), isLoadingDetail: false });
    }
  },

  /**
   * Fetch the full leaderboard for a group.
   */
  fetchLeaderboard: async (groupId) => {
    set({ isLoadingDetail: true, detailError: null });
    try {
      const leaderboard = await groupsApi.getLeaderboard(groupId);
      set({ leaderboard, isLoadingDetail: false });
    } catch (error: unknown) {
      set({ detailError: getErrorMessage(error), isLoadingDetail: false });
    }
  },

  /**
   * Create a new group.
   */
  createGroup: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const previousGroupCount = get().myGroups.length;

      const group = await groupsApi.createGroup(data);
      // Refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoading: false });

      // Track analytics and evaluate milestones
      await handleGroupCountChange(
        previousGroupCount,
        myGroups,
        group.id,
        'group_created',
        {
          name: group.name,
          is_public: !data.is_private,
          member_count: 1,
        }
      );

      return group;
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  /**
   * Join a group by ID.
   */
  joinGroup: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const previousGroupCount = get().myGroups.length;

      await groupsApi.joinGroup(groupId);
      // Refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoading: false });

      // Find the joined group to get its details
      const joinedGroup = myGroups.find(g => g.id === groupId);

      // Track analytics and evaluate milestones
      await handleGroupCountChange(
        previousGroupCount,
        myGroups,
        groupId,
        'group_joined',
        {
          name: joinedGroup?.name,
          is_public: joinedGroup ? !joinedGroup.is_private : undefined,
          member_count: joinedGroup?.member_count,
        }
      );
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  /**
   * Join a group by join code.
   */
  joinGroupByCode: async (code) => {
    set({ isLoading: true, error: null });
    try {
      const previousGroupCount = get().myGroups.length;

      const groupId = await groupsApi.joinGroupByCode(code);
      // Refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoading: false });

      // Find the joined group to get its details
      const joinedGroup = myGroups.find(g => g.id === groupId);

      // Track analytics and evaluate milestones
      await handleGroupCountChange(
        previousGroupCount,
        myGroups,
        groupId,
        'group_joined',
        {
          name: joinedGroup?.name,
          is_public: joinedGroup ? !joinedGroup.is_private : undefined,
          member_count: joinedGroup?.member_count,
        }
      );

      return groupId;
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  /**
   * Leave a group.
   */
  leaveGroup: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      // Get the group name before leaving
      const leavingGroup = get().myGroups.find(g => g.id === groupId);

      await groupsApi.leaveGroup(groupId);
      // Refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoading: false });

      // Track group left event
      track('group_left', {
        group_id: groupId,
        group_name: leavingGroup?.name,
      });

      // Update user properties with new group count
      setUserProperties({ group_count: myGroups.length });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  /**
   * Clear current group state when leaving detail screen.
   */
  clearCurrentGroup: () => {
    set({ currentGroup: null, leaderboard: [] });
  },

  /**
   * Fetch full group details for management screen.
   */
  fetchGroupDetails: async (groupId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      const group = await groupsApi.getGroupDetails(groupId);
      set({ managementGroup: group, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
    }
  },

  /**
   * Search for public groups.
   */
  searchPublicGroups: async (query) => {
    set({ isSearching: true, searchError: null });
    try {
      const publicGroups = await groupsApi.searchPublicGroups(query);
      set({ publicGroups, isSearching: false });
    } catch (error: unknown) {
      set({ searchError: getErrorMessage(error), isSearching: false });
    }
  },

  /**
   * Fetch featured/popular public groups.
   */
  fetchFeaturedGroups: async () => {
    set({ isLoadingFeatured: true });
    try {
      const featuredGroups = await groupsApi.getPublicGroups(10);
      set({ featuredGroups, isLoadingFeatured: false });
    } catch (error: unknown) {
      set({ isLoadingFeatured: false });
    }
  },

  /**
   * Update group details.
   */
  updateGroup: async (groupId, data) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      await groupsApi.updateGroup(groupId, data);
      // Refresh group details
      const group = await groupsApi.getGroupDetails(groupId);
      set({ managementGroup: group, isLoadingManagement: false });
      // Also refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
      throw error;
    }
  },

  /**
   * Delete a group.
   */
  deleteGroup: async (groupId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      await groupsApi.deleteGroup(groupId);
      // Refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
      throw error;
    }
  },

  /**
   * Fetch group members.
   */
  fetchMembers: async (groupId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      const members = await groupsApi.getMembers(groupId);
      set({ members, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
    }
  },

  /**
   * Promote a member to admin.
   */
  promoteMember: async (groupId, userId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      await groupsApi.promoteMember(groupId, userId);
      const members = await groupsApi.getMembers(groupId);
      set({ members, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
      throw error;
    }
  },

  /**
   * Demote an admin to member.
   */
  demoteMember: async (groupId, userId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      await groupsApi.demoteMember(groupId, userId);
      const members = await groupsApi.getMembers(groupId);
      set({ members, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
      throw error;
    }
  },

  /**
   * Remove a member from the group.
   */
  removeMember: async (groupId, userId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      await groupsApi.removeMember(groupId, userId);
      const members = await groupsApi.getMembers(groupId);
      set({ members, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
      throw error;
    }
  },

  /**
   * Fetch pending member requests.
   */
  fetchPendingMembers: async (groupId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      const pendingMembers = await groupsApi.getPendingMembers(groupId);
      set({ pendingMembers, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
    }
  },

  /**
   * Approve a pending member request.
   */
  approveMember: async (groupId, userId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      await groupsApi.approveMember(groupId, userId);
      const [members, pendingMembers] = await Promise.all([
        groupsApi.getMembers(groupId),
        groupsApi.getPendingMembers(groupId),
      ]);
      set({ members, pendingMembers, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
      throw error;
    }
  },

  /**
   * Deny a pending member request.
   */
  denyMember: async (groupId, userId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      await groupsApi.denyMember(groupId, userId);
      const pendingMembers = await groupsApi.getPendingMembers(groupId);
      set({ pendingMembers, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
      throw error;
    }
  },

  /**
   * Fetch the current invite code.
   */
  fetchInviteCode: async (groupId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      const inviteCode = await groupsApi.getInviteCode(groupId);
      set({ inviteCode, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
    }
  },

  /**
   * Generate a new invite code.
   */
  generateInviteCode: async (groupId) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      const inviteCode = await groupsApi.generateInviteCode(groupId);
      set({ inviteCode, isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
      throw error;
    }
  },

  /**
   * Invite friends to the group.
   */
  inviteFriends: async (groupId, friendIds) => {
    set({ isLoadingManagement: true, managementError: null });
    try {
      await groupsApi.inviteFriends(groupId, friendIds);

      // Track invite sent events for each friend invited
      for (const friendId of friendIds) {
        track('invite_sent', {
          invite_type: 'group',
          method: 'in_app',
        });
      }

      set({ isLoadingManagement: false });
    } catch (error: unknown) {
      set({ managementError: getErrorMessage(error), isLoadingManagement: false });
      throw error;
    }
  },

  /**
   * Clear management state when leaving management screens.
   */
  clearManagementState: () => {
    set({
      managementGroup: null,
      members: [],
      pendingMembers: [],
      inviteCode: null,
      managementError: null,
    });
  },

  /**
   * Clear search state.
   */
  clearSearch: () => {
    set({ publicGroups: [], searchError: null });
  },
}));

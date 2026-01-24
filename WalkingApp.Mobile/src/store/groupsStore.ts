import { create } from 'zustand';
import { groupsApi } from '@services/api/groupsApi';
import { getErrorMessage } from '@utils/errorUtils';

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
      const group = await groupsApi.createGroup(data);
      // Refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoading: false });
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
      await groupsApi.joinGroup(groupId);
      // Refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoading: false });
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
      const groupId = await groupsApi.joinGroupByCode(code);
      // Refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoading: false });
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
      await groupsApi.leaveGroup(groupId);
      // Refresh my groups list
      const myGroups = await groupsApi.getMyGroups();
      set({ myGroups, isLoading: false });
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
}));

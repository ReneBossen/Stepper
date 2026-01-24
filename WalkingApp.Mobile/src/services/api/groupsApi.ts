import { supabase } from '../supabase';
import { Group, GroupMember, CreateGroupData, GroupWithLeaderboard, LeaderboardEntry } from '@store/groupsStore';

/**
 * Calculate competition period dates based on period type.
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

/**
 * Format date range for display.
 */
function formatPeriodDates(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (startDate === endDate) {
    return start.toLocaleDateString('en-US', { ...options, year: 'numeric' });
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

export const groupsApi = {
  /**
   * Get all groups the current user is a member of with leaderboard preview.
   */
  getMyGroups: async (): Promise<GroupWithLeaderboard[]> => {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get groups where user is a member
    const { data: memberships, error: membershipError } = await supabase
      .from('group_memberships')
      .select(`
        role,
        groups (
          id,
          name,
          description,
          period_type,
          is_public,
          join_code,
          created_by_id,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (membershipError) throw membershipError;

    if (!memberships || memberships.length === 0) {
      return [];
    }

    // For each group, get member count and leaderboard preview
    const groupsWithLeaderboard: GroupWithLeaderboard[] = await Promise.all(
      memberships.map(async (membership: any) => {
        const group = membership.groups;
        const { startDate, endDate } = getCompetitionPeriodDates(group.period_type);

        // Get member count
        const { count: memberCount } = await supabase
          .from('group_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        // Get leaderboard using database function
        const { data: leaderboardData, error: leaderboardError } = await supabase
          .rpc('get_group_leaderboard', {
            p_group_id: group.id,
            p_start_date: startDate,
            p_end_date: endDate,
          });

        if (leaderboardError) {
          console.error('Leaderboard error:', leaderboardError);
        }

        // Map leaderboard data and find current user's position
        const leaderboard: LeaderboardEntry[] = (leaderboardData || []).map((entry: any) => ({
          user_id: entry.user_id,
          display_name: entry.display_name,
          avatar_url: entry.avatar_url,
          steps: entry.total_steps,
          rank: Number(entry.rank),
          rank_change: 0, // Will be calculated when we have historical data
          is_current_user: entry.user_id === user.id,
        }));

        // Find current user's entry
        const currentUserEntry = leaderboard.find(e => e.is_current_user);

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          competition_type: group.period_type as 'daily' | 'weekly' | 'monthly',
          is_private: !group.is_public,
          member_count: memberCount || 0,
          created_at: group.created_at,
          created_by_id: group.created_by_id,
          join_code: group.join_code,
          user_role: membership.role as 'owner' | 'admin' | 'member',
          period_start: startDate,
          period_end: endDate,
          period_display: formatPeriodDates(startDate, endDate),
          leaderboard_preview: leaderboard.slice(0, 3),
          current_user_rank: currentUserEntry?.rank,
          current_user_steps: currentUserEntry?.steps,
        };
      })
    );

    return groupsWithLeaderboard;
  },

  /**
   * Get all groups (for browsing public groups).
   */
  getGroups: async (): Promise<Group[]> => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_memberships(count)
      `);

    if (error) throw error;

    return data?.map((group: any) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      competition_type: group.period_type,
      is_private: !group.is_public,
      member_count: group.group_memberships?.[0]?.count || 0,
      created_at: group.created_at,
    })) || [];
  },

  /**
   * Get a single group with full details.
   */
  getGroup: async (groupId: string): Promise<Group & { user_role?: 'owner' | 'admin' | 'member'; period_start: string; period_end: string; period_display: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_memberships(count)
      `)
      .eq('id', groupId)
      .single();

    if (error) throw error;

    // Get user's role in this group
    const { data: membershipData } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    const { startDate, endDate } = getCompetitionPeriodDates(data.period_type);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      competition_type: data.period_type,
      is_private: !data.is_public,
      member_count: data.group_memberships?.[0]?.count || 0,
      created_at: data.created_at,
      user_role: membershipData?.role,
      period_start: startDate,
      period_end: endDate,
      period_display: formatPeriodDates(startDate, endDate),
    };
  },

  /**
   * Get full leaderboard for a group.
   */
  getLeaderboard: async (groupId: string, periodType?: string): Promise<LeaderboardEntry[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get period type if not provided
    let resolvedPeriodType: string = periodType || '';
    if (!resolvedPeriodType) {
      const { data: groupData } = await supabase
        .from('groups')
        .select('period_type')
        .eq('id', groupId)
        .single();
      resolvedPeriodType = groupData?.period_type || 'weekly';
    }

    const { startDate, endDate } = getCompetitionPeriodDates(resolvedPeriodType);

    // Get current leaderboard
    const { data: currentLeaderboard, error } = await supabase
      .rpc('get_group_leaderboard', {
        p_group_id: groupId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (error) throw error;

    // Get previous period leaderboard for rank change calculation
    let previousRanks: Map<string, number> = new Map();

    // Calculate previous period dates
    const today = new Date();
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (resolvedPeriodType) {
      case 'daily':
        prevStartDate = new Date(today);
        prevStartDate.setDate(today.getDate() - 1);
        prevEndDate = prevStartDate;
        break;
      case 'weekly':
        const currentStart = new Date(startDate);
        prevStartDate = new Date(currentStart);
        prevStartDate.setDate(currentStart.getDate() - 7);
        prevEndDate = new Date(prevStartDate);
        prevEndDate.setDate(prevStartDate.getDate() + 6);
        break;
      case 'monthly':
        prevStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        prevEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        prevStartDate = new Date(today);
        prevStartDate.setDate(today.getDate() - 1);
        prevEndDate = prevStartDate;
    }

    const { data: previousLeaderboard } = await supabase
      .rpc('get_group_leaderboard', {
        p_group_id: groupId,
        p_start_date: prevStartDate.toISOString().split('T')[0],
        p_end_date: prevEndDate.toISOString().split('T')[0],
      });

    if (previousLeaderboard) {
      previousLeaderboard.forEach((entry: any) => {
        previousRanks.set(entry.user_id, Number(entry.rank));
      });
    }

    // Map to LeaderboardEntry with rank changes
    return (currentLeaderboard || []).map((entry: any) => {
      const currentRank = Number(entry.rank);
      const previousRank = previousRanks.get(entry.user_id);
      let rankChange = 0;

      if (previousRank !== undefined) {
        rankChange = previousRank - currentRank; // Positive = moved up, negative = moved down
      }

      return {
        user_id: entry.user_id,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url,
        steps: entry.total_steps,
        rank: currentRank,
        rank_change: rankChange,
        is_current_user: entry.user_id === user.id,
      };
    });
  },

  /**
   * Get group members with their roles.
   */
  getMembers: async (groupId: string): Promise<GroupMember[]> => {
    const { data, error } = await supabase
      .from('group_memberships')
      .select(`
        user_id,
        role,
        joined_at,
        users (
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('group_id', groupId);

    if (error) throw error;

    return (data || []).map((member: any, index: number) => ({
      user_id: member.user_id,
      display_name: member.users.display_name,
      username: member.users.username,
      avatar_url: member.users.avatar_url,
      role: member.role,
      joined_at: member.joined_at,
      steps: 0,
      rank: index + 1,
    }));
  },

  /**
   * Create a new group.
   */
  createGroup: async (data: CreateGroupData): Promise<Group> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate join code for private groups
    const joinCode = data.is_private
      ? Math.random().toString(36).substring(2, 8).toUpperCase()
      : null;

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: data.name,
        description: data.description,
        period_type: data.competition_type,
        is_public: !data.is_private,
        created_by_id: user.id,
        join_code: joinCode,
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as owner
    await supabase
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'owner',
      });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      competition_type: group.period_type,
      is_private: !group.is_public,
      member_count: 1,
      created_at: group.created_at,
    };
  },

  /**
   * Join a group (public or with join code).
   */
  joinGroup: async (groupId: string): Promise<void> => {
    const { error } = await supabase
      .from('group_memberships')
      .insert({
        group_id: groupId,
        role: 'member',
      });

    if (error) throw error;
  },

  /**
   * Join a group by join code.
   */
  joinGroupByCode: async (joinCode: string): Promise<string> => {
    // Find group by join code
    const { data: group, error: findError } = await supabase
      .from('groups')
      .select('id')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    if (findError || !group) {
      throw new Error('Invalid join code');
    }

    // Join the group
    const { error: joinError } = await supabase
      .from('group_memberships')
      .insert({
        group_id: group.id,
        role: 'member',
      });

    if (joinError) throw joinError;

    return group.id;
  },

  /**
   * Leave a group.
   */
  leaveGroup: async (groupId: string): Promise<void> => {
    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId);

    if (error) throw error;
  },

  /**
   * Subscribe to leaderboard changes for a group.
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
};

import { supabase } from '../supabase';
import { Group, GroupMember, CreateGroupData } from '@store/groupsStore';

export const groupsApi = {
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
      competition_type: group.competition_type,
      is_private: group.is_private,
      member_count: group.group_memberships?.[0]?.count || 0,
      created_at: group.created_at,
    })) || [];
  },

  getGroup: async (groupId: string): Promise<Group> => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_memberships(count)
      `)
      .eq('id', groupId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      competition_type: data.competition_type,
      is_private: data.is_private,
      member_count: data.group_memberships?.[0]?.count || 0,
      created_at: data.created_at,
    };
  },

  getLeaderboard: async (groupId: string): Promise<GroupMember[]> => {
    const { data, error } = await supabase
      .from('group_memberships')
      .select(`
        user_id,
        users (
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('group_id', groupId);

    if (error) throw error;

    // Fetch step counts for each member
    const today = new Date().toISOString().split('T')[0];
    const membersWithSteps = await Promise.all(
      (data || []).map(async (member: any, index: number) => {
        const { data: stepData } = await supabase
          .from('step_entries')
          .select('step_count')
          .eq('user_id', member.user_id)
          .eq('date', today)
          .single();

        return {
          user_id: member.user_id,
          display_name: member.users.display_name,
          username: member.users.username,
          avatar_url: member.users.avatar_url,
          steps: stepData?.step_count || 0,
          rank: index + 1,
        };
      })
    );

    // Sort by steps and update ranks
    const sorted = membersWithSteps.sort((a, b) => b.steps - a.steps);
    return sorted.map((member, index) => ({ ...member, rank: index + 1 }));
  },

  createGroup: async (data: CreateGroupData): Promise<Group> => {
    const { data: group, error } = await supabase
      .from('groups')
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    // Automatically add creator as member
    await supabase
      .from('group_memberships')
      .insert({
        group_id: group.id,
      });

    return {
      ...group,
      member_count: 1,
    };
  },

  joinGroup: async (groupId: string): Promise<void> => {
    const { error } = await supabase
      .from('group_memberships')
      .insert({
        group_id: groupId,
      });

    if (error) throw error;
  },

  leaveGroup: async (groupId: string): Promise<void> => {
    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId);

    if (error) throw error;
  },
};

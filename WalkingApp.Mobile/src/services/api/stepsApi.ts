import { supabase } from '../supabase';
import { StepEntry, StepStats } from '@store/stepsStore';

export const stepsApi = {
  addSteps: async (steps: number, distanceMeters: number): Promise<StepEntry> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('step_entries')
      .upsert({
        date: today,
        steps,
        distance_meters: distanceMeters,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getTodaySteps: async (): Promise<StepEntry> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('step_entries')
      .select('*')
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    return data || { id: '', user_id: '', date: today, steps: 0, distance_meters: 0, created_at: '' };
  },

  getStats: async (): Promise<StepStats> => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: todayData } = await supabase
      .from('step_entries')
      .select('steps')
      .eq('date', today)
      .single();

    const { data: weekData } = await supabase
      .from('step_entries')
      .select('steps')
      .gte('date', weekAgo);

    const { data: monthData } = await supabase
      .from('step_entries')
      .select('steps')
      .gte('date', monthAgo);

    const weekTotal = weekData?.reduce((sum, entry) => sum + entry.steps, 0) || 0;
    const monthTotal = monthData?.reduce((sum, entry) => sum + entry.steps, 0) || 0;

    // Calculate streak
    const { data: allData } = await supabase
      .from('step_entries')
      .select('date, steps')
      .order('date', { ascending: false });

    let streak = 0;
    if (allData) {
      let currentDate = new Date();
      for (const entry of allData) {
        const entryDate = new Date(entry.date);
        const diffDays = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === streak && entry.steps > 0) {
          streak++;
        } else {
          break;
        }
      }
    }

    return {
      today: todayData?.steps || 0,
      week: weekTotal,
      month: monthTotal,
      average: monthData && monthData.length > 0 ? Math.floor(monthTotal / monthData.length) : 0,
      streak,
    };
  },

  getHistory: async (period: 'daily' | 'weekly' | 'monthly'): Promise<StepEntry[]> => {
    let daysAgo = 7;
    if (period === 'monthly') daysAgo = 30;
    if (period === 'weekly') daysAgo = 7;

    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('step_entries')
      .select('*')
      .gte('date', startDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

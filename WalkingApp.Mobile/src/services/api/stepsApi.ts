import { supabase } from '../supabase';
import { StepEntry, StepStats, DailyStepEntry } from '@store/stepsStore';

export const stepsApi = {
  addSteps: async (steps: number, distanceMeters: number): Promise<StepEntry> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('step_entries')
      .upsert({
        date: today,
        step_count: steps,
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

    return data || { id: '', user_id: '', date: today, step_count: 0, distance_meters: 0, created_at: '' };
  },

  getStats: async (): Promise<StepStats> => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: todayData } = await supabase
      .from('step_entries')
      .select('step_count')
      .eq('date', today)
      .single();

    const { data: weekData } = await supabase
      .from('step_entries')
      .select('step_count')
      .gte('date', weekAgo);

    const { data: monthData } = await supabase
      .from('step_entries')
      .select('step_count')
      .gte('date', monthAgo);

    const weekTotal = weekData?.reduce((sum, entry) => sum + entry.step_count, 0) || 0;
    const monthTotal = monthData?.reduce((sum, entry) => sum + entry.step_count, 0) || 0;

    // Calculate streak using UTC dates to avoid timezone sensitivity issues
    const { data: allData } = await supabase
      .from('step_entries')
      .select('date, step_count')
      .order('date', { ascending: false });

    let streak = 0;
    if (allData) {
      // Get current date in UTC (YYYY-MM-DD format)
      const now = new Date();
      const currentDateUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

      for (const entry of allData) {
        // Parse entry date as UTC (database stores dates as YYYY-MM-DD)
        const [year, month, day] = entry.date.split('-').map(Number);
        const entryDateUtc = Date.UTC(year, month - 1, day);

        // Calculate difference in days using UTC timestamps
        const diffDays = Math.floor((currentDateUtc - entryDateUtc) / (1000 * 60 * 60 * 24));

        if (diffDays === streak && entry.step_count > 0) {
          streak++;
        } else {
          break;
        }
      }
    }

    return {
      today: todayData?.step_count || 0,
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

  /**
   * Fetches daily step history within a date range.
   * Returns entries ordered by date descending (most recent first).
   *
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Array of daily step entries
   */
  getDailyHistory: async (startDate: string, endDate: string): Promise<DailyStepEntry[]> => {
    const { data, error } = await supabase
      .from('step_entries')
      .select('id, date, step_count, distance_meters')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map((entry) => ({
      id: entry.id,
      date: entry.date,
      steps: entry.step_count,
      distanceMeters: entry.distance_meters,
    }));
  },
};

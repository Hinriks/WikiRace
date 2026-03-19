import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DailyStats {
  avgClicks: number;
  avgTime: number;
  count: number;
}

export function useDailyStats(date: string, enabled: boolean): DailyStats | null {
  const [stats, setStats] = useState<DailyStats | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const hasConfig =
      import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      !import.meta.env.VITE_SUPABASE_URL.includes('your_supabase');

    if (!hasConfig) return;

    async function fetchStats() {
      const { data } = await supabase
        .from('results')
        .select('clicks, time_seconds')
        .eq('puzzle_date', date);

      if (!data || data.length === 0) return;

      const avgClicks = Math.round(
        data.reduce((sum, r) => sum + r.clicks, 0) / data.length
      );
      const avgTime =
        data.reduce((sum, r) => sum + Number(r.time_seconds), 0) / data.length;

      setStats({ avgClicks, avgTime, count: data.length });
    }

    fetchStats();
  }, [date, enabled]);

  return stats;
}

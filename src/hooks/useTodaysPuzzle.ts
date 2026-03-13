import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Puzzle } from '../types';
import { FALLBACK_PUZZLES } from '../data/fallbackPuzzles';

export function getTodayUTC(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPuzzleNumber(): number {
  const epoch = Date.UTC(2026, 2, 13);
  const now = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  );
  return Math.max(1, Math.floor((now - epoch) / 86400000) + 1);
}

function getFallbackPuzzle(): Puzzle {
  const dayIndex = Math.floor(Date.now() / 86400000) % FALLBACK_PUZZLES.length;
  const p = FALLBACK_PUZZLES[dayIndex];
  return {
    id: dayIndex + 1,
    date: getTodayUTC(),
    start_article: p.start_article,
    end_article: p.end_article,
  };
}

export function useTodaysPuzzle() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPuzzle() {
      const hasConfig =
        import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!hasConfig) {
        setPuzzle(getFallbackPuzzle());
        setLoading(false);
        return;
      }

      try {
        const today = getTodayUTC();
        const { data, error: sbError } = await supabase
          .from('daily_puzzles')
          .select('*')
          .eq('date', today)
          .single();

        if (sbError || !data) {
          setPuzzle(getFallbackPuzzle());
        } else {
          setPuzzle(data as Puzzle);
        }
      } catch {
        setPuzzle(getFallbackPuzzle());
      } finally {
        setLoading(false);
      }
    }

    fetchPuzzle();
  }, []);

  return { puzzle, loading, error };
}

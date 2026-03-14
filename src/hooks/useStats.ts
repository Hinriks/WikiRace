import type { GameResult, Puzzle } from '../types';

const STATS_KEY = 'wikirace_stats_v1';
const MAX_RECENT = 5;

export interface RecentGame {
  date: string;
  start: string;
  end: string;
  clicks: number;
  timeSeconds: number;
  won: boolean;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  totalWinClicks: number;
  bestClicks: number | null;
  bestTime: number | null;
  recentGames: RecentGame[];
}

const defaults: PlayerStats = {
  gamesPlayed: 0,
  wins: 0,
  totalWinClicks: 0,
  bestClicks: null,
  bestTime: null,
  recentGames: [],
};

export function getStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, recentGames: [], ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function updateStats(result: GameResult, puzzle: Puzzle): void {
  try {
    const stats = getStats();
    stats.gamesPlayed += 1;
    if (result.won) {
      stats.wins += 1;
      stats.totalWinClicks += result.clicks;
      if (stats.bestClicks === null || result.clicks < stats.bestClicks) {
        stats.bestClicks = result.clicks;
      }
      if (stats.bestTime === null || result.timeSeconds < stats.bestTime) {
        stats.bestTime = result.timeSeconds;
      }
    }
    const entry: RecentGame = {
      date: puzzle.date,
      start: puzzle.start_article,
      end: puzzle.end_article,
      clicks: result.clicks,
      timeSeconds: result.timeSeconds,
      won: result.won,
    };
    stats.recentGames = [entry, ...stats.recentGames].slice(0, MAX_RECENT);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage errors
  }
}
